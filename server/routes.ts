import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClaimSchema, insertTaskSchema, insertActivityLogSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import Papa from "papaparse";
import { Readable } from "stream";

declare global {
  namespace Express {
    interface User {
      claims: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

async function getUserContext(req: any): Promise<{ userId: string; tenantId: string }> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // Use active tenant from session, fallback to user's primary tenant
  const tenantId = req.session.activeTenantId || user.tenantId;
  
  // Verify user has access to this tenant
  const userTenants = await storage.getUserTenants(userId);
  
  // If user has no user_tenants entries, allow access to all tenants (for demo/testing)
  let hasAccess = false;
  if (userTenants.length === 0) {
    // No restrictions - check if tenant exists
    const tenant = await storage.getTenant(tenantId);
    hasAccess = !!tenant;
  } else {
    // Check explicit access
    hasAccess = userTenants.some(t => t.id === tenantId) || user.tenantId === tenantId;
  }
  
  if (!hasAccess) {
    // Reset to primary tenant if no access
    req.session.activeTenantId = user.tenantId;
    return {
      userId,
      tenantId: user.tenantId,
    };
  }
  
  return {
    userId,
    tenantId,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...safeUser } = user;
      
      // Include active tenant info
      const activeTenantId = req.session.activeTenantId || user.tenantId;
      const activeTenant = await storage.getTenant(activeTenantId);
      
      res.json({
        ...safeUser,
        activeTenantId,
        activeTenantName: activeTenant?.name,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/user/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's accessible tenants (primary tenant + additional tenants)
      const additionalTenants = await storage.getUserTenants(userId);
      const primaryTenant = await storage.getTenant(user.tenantId);
      
      // If user has no additional tenants, grant access to all tenants (for demo/testing)
      let tenants;
      if (additionalTenants.length === 0) {
        tenants = await storage.getTenants();
      } else {
        // Combine and deduplicate
        const tenantMap = new Map();
        if (primaryTenant) {
          tenantMap.set(primaryTenant.id, primaryTenant);
        }
        additionalTenants.forEach(t => tenantMap.set(t.id, t));
        
        tenants = Array.from(tenantMap.values());
      }
      
      tenants.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching user tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post('/api/user/switch-tenant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { tenantId } = req.body;
      
      if (!tenantId) {
        return res.status(400).json({ message: "tenantId is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify user has access to this tenant
      const userTenants = await storage.getUserTenants(userId);
      
      // If user has no user_tenants entries, allow access to all tenants (for demo/testing)
      let hasAccess = false;
      if (userTenants.length === 0) {
        // No restrictions - check if tenant exists
        const tenant = await storage.getTenant(tenantId);
        hasAccess = !!tenant;
      } else {
        // Check explicit access
        hasAccess = userTenants.some(t => t.id === tenantId) || user.tenantId === tenantId;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this tenant" });
      }
      
      // Update session with new active tenant
      req.session.activeTenantId = tenantId;
      
      const tenant = await storage.getTenant(tenantId);
      res.json({ 
        success: true, 
        activeTenantId: tenantId,
        activeTenantName: tenant?.name,
      });
    } catch (error) {
      console.error("Error switching tenant:", error);
      res.status(500).json({ message: "Failed to switch tenant" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserContext(req);
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'system_administrator') {
        return res.status(403).json({ message: "Only System Administrators can access user management" });
      }
      
      const users = await storage.getUsers(tenantId);
      
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserContext(req);
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'system_administrator') {
        return res.status(403).json({ message: "Only System Administrators can update user roles" });
      }

      const { role } = req.body;
      const validRoles = ['rcm_specialist', 'manager', 'system_administrator', 'client_user', 'auditor'];
      
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Verify the target user belongs to the same tenant
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (targetUser.tenantId !== tenantId) {
        return res.status(403).json({ message: "Cannot update users from different tenants" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get('/api/claims', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      
      const filters = {
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
        assignedTo: req.query.assignedTo as string,
        minAge: req.query.minAge ? parseInt(req.query.minAge as string) : undefined,
        maxAge: req.query.maxAge ? parseInt(req.query.maxAge as string) : undefined,
        minBalance: req.query.minBalance ? parseFloat(req.query.minBalance as string) : undefined,
        maxBalance: req.query.maxBalance ? parseFloat(req.query.maxBalance as string) : undefined,
        payorName: req.query.payorName as string,
        search: req.query.search as string,
        lineOfBusiness: req.query.lineOfBusiness ? (Array.isArray(req.query.lineOfBusiness) ? req.query.lineOfBusiness : [req.query.lineOfBusiness]) : undefined,
        criteria: req.query.criteria ? (Array.isArray(req.query.criteria) ? req.query.criteria : [req.query.criteria]) : undefined,
        team: req.query.team ? (Array.isArray(req.query.team) ? req.query.team : [req.query.team]) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const claims = await storage.getClaims(tenantId, filters);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });

  app.get('/api/claims/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const claim = await storage.getClaim(req.params.id, tenantId);
      
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      res.json(claim);
    } catch (error) {
      console.error("Error fetching claim:", error);
      res.status(500).json({ message: "Failed to fetch claim" });
    }
  });

  app.post('/api/claims', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const claimData = insertClaimSchema.parse({ ...req.body, tenantId });
      const claim = await storage.createClaim(claimData);
      
      await storage.createActivityLog({
        tenantId,
        claimId: claim.id!,
        userId,
        action: "created",
        details: { claimNumber: claim.invoiceNumber },
      });
      
      res.status(201).json(claim);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating claim:", error);
      res.status(500).json({ message: "Failed to create claim" });
    }
  });

  app.patch('/api/claims/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const allowedFields = ['status', 'slaStatus', 'assignedTo', 'balanceDue', 'appliedAmount', 
                             'invoiceStatus', 'denialCodes', 'lastDenialDate', 'priorityScore', 'note',
                             'actionCategory', 'billingProvider', 'dateClaimSent', 'errorFile', 
                             'financialClass', 'fixedDenial', 'fixedRemarkCode', 'followUpDays', 
                             'grossAmount', 'location', 'maxCreateDate', 'nrcContract', 'payment', 
                             'payorId', 'payorType', 'pfx', 'renderingProvider', 'servicingLocation', 
                             'sfx', 'writeOffs', 'allowedAmount', 'lineOfBusiness', 'criteria', 'team'];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const claim = await storage.updateClaim(req.params.id, tenantId, updates);
      
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      await storage.createActivityLog({
        tenantId,
        claimId: claim.id!,
        userId,
        action: "updated",
        details: { updates },
      });
      
      res.json(claim);
    } catch (error) {
      console.error("Error updating claim:", error);
      res.status(500).json({ message: "Failed to update claim" });
    }
  });

  app.post('/api/claims/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      if (!Array.isArray(req.body)) {
        return res.status(400).json({ message: "Request body must be an array" });
      }
      
      const validatedClaims = [];
      const errors = [];
      
      for (let i = 0; i < req.body.length; i++) {
        try {
          const validated = insertClaimSchema.parse({ ...req.body[i], tenantId });
          validatedClaims.push(validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push({ index: i, errors: error.errors });
          }
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({ message: "Validation errors", errors });
      }
      
      const claims = await storage.bulkCreateClaims(validatedClaims);
      
      await storage.createActivityLog({
        tenantId,
        userId,
        action: "bulk_import",
        details: { count: claims.length },
      });
      
      res.status(201).json({ count: claims.length, claims });
    } catch (error) {
      console.error("Error bulk creating claims:", error);
      res.status(500).json({ message: "Failed to bulk create claims" });
    }
  });

  app.post('/api/claims/upload', isAuthenticated, fileUpload.single('file'), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf8');
      
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV parsing error", 
          errors: parseResult.errors 
        });
      }

      const csvData = parseResult.data as any[];
      
      if (csvData.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const validatedClaims: any[] = [];
      const errors: any[] = [];
      
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const claimData = {
            tenantId,
            invoiceNumber: row['Claim Number'] || row['Invoice Number'] || row['invoiceNumber'],
            customerName: row['Client'] || row['Customer Name'] || row['customerName'] || row['client'],
            invoiceDate: row['Invoice Date'] || row['invoiceDate'],
            balanceDue: row['Balance'] || row['Balance Due'] || row['balanceDue'] || '0',
            payorName: row['Payor Name'] || row['payorName'] || '',
            invoiceAge: row['Invoice Age'] ? parseInt(row['Invoice Age']) : null,
            invoiceAgeBucket: row['Invoice Age Bucket'] || row['invoiceAgeBucket'] || null,
            dateOfService: row['Date of Service'] || row['dateOfService'] || null,
            dosAgeBucket: row['DOS Age Bucket'] || row['dosAgeBucket'] || null,
            payorCode: row['Payor Code'] || row['payorCode'] || null,
            payorType: row['Payor Type'] || row['payorType'] || null,
            denialCodes: row['Denial Codes'] || row['denialCodes'] || null,
            listPrice: row['List Price'] || row['listPrice'] || null,
            allowedAmount: row['Allowed Amount'] || row['allowedAmount'] || null,
          };

          const validated = insertClaimSchema.parse(claimData);
          validatedClaims.push(validated);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push({ 
              row: i + 2, 
              data: row, 
              errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
            });
          }
        }
      }

      if (errors.length > 0) {
        const errorSample = errors.slice(0, 10);
        return res.status(400).json({ 
          message: `Validation failed for ${errors.length} rows`, 
          errorSample,
          totalErrors: errors.length
        });
      }

      const result = await storage.bulkImportClaimsWithTasks(validatedClaims, tenantId, userId, req.file.originalname);

      res.status(201).json({ 
        imported: result.claimsCount,
        tasksCreated: result.tasksCount,
        message: `Successfully imported ${result.claimsCount} claims and created ${result.tasksCount} tasks`
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      
      const filters = {
        status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : undefined,
        assignedTo: req.query.assignedTo as string,
        claimId: req.query.claimId as string,
        priority: req.query.priority as string,
        client: req.query.client as string,
        search: req.query.search as string,
        lineOfBusiness: req.query.lineOfBusiness ? (Array.isArray(req.query.lineOfBusiness) ? req.query.lineOfBusiness : [req.query.lineOfBusiness]) : undefined,
        criteria: req.query.criteria ? (Array.isArray(req.query.criteria) ? req.query.criteria : [req.query.criteria]) : undefined,
        team: req.query.team ? (Array.isArray(req.query.team) ? req.query.team : [req.query.team]) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await storage.getTasksWithDetails(tenantId, filters);
      res.json(result);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const task = await storage.getTaskWithDetails(req.params.id, tenantId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const taskData = insertTaskSchema.parse({ ...req.body, tenantId });
      const task = await storage.createTask(taskData);
      
      await storage.createActivityLog({
        tenantId,
        claimId: task.claimId,
        taskId: task.id!,
        userId,
        action: "task_created",
        details: { taskTitle: task.title },
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/bulk-assign', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const { taskIds, assignedTo } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "taskIds must be a non-empty array" });
      }
      
      if (assignedTo !== null && typeof assignedTo !== 'string') {
        return res.status(400).json({ message: "assignedTo must be a string or null" });
      }
      
      const count = await storage.bulkAssignTasks(taskIds, tenantId, assignedTo);
      
      await storage.createActivityLog({
        tenantId,
        userId,
        action: "tasks_bulk_assigned",
        details: { taskCount: count, assignedTo },
      });
      
      res.json({ count, assignedTo });
    } catch (error) {
      console.error("Error bulk assigning tasks:", error);
      res.status(500).json({ message: "Failed to bulk assign tasks" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const allowedFields = [
        'status', 'assignedTo', 'title', 'description', 'priority', 'dueDate',
        'resolutionCategory', 'rootCauseCategory', 'rootCauseDetail', 
        'resolutionAction', 'notes', 'progressPercent'
      ];
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      
      const task = await storage.updateTask(req.params.id, tenantId, updates);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      await storage.createActivityLog({
        tenantId,
        claimId: task.claimId,
        taskId: task.id!,
        userId,
        action: "task_updated",
        details: { updates },
      });
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.post('/api/tasks/:id/timer/start', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const task = await storage.startTaskTimer(req.params.id, tenantId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error starting timer:", error);
      res.status(500).json({ message: "Failed to start timer" });
    }
  });

  app.post('/api/tasks/:id/timer/stop', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const task = await storage.stopTaskTimer(req.params.id, tenantId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error stopping timer:", error);
      res.status(500).json({ message: "Failed to stop timer" });
    }
  });

  app.get('/api/task-metadata', isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        resolutionCategories: [
          'Claim Approved',
          'Claim Denied',
          'Claim Pending',
          'Information Requested',
          'Appeal Filed',
          'Payment Received',
          'Other'
        ],
        rootCauseCategories: [
          'Missing Information',
          'Coding Error',
          'Authorization Issue',
          'Eligibility Problem',
          'Provider Network Issue',
          'Billing Error',
          'Medical Necessity',
          'Other'
        ],
        rootCauseDetails: [
          'Missing documentation',
          'Incorrect procedure code',
          'Prior authorization not obtained',
          'Patient not eligible on DOS',
          'Out of network provider',
          'Duplicate claim',
          'Services not medically necessary',
          'Timely filing limit exceeded',
          'Other'
        ],
        resolutionActions: [
          'Submitted additional documentation',
          'Corrected coding',
          'Obtained authorization',
          'Verified eligibility',
          'Contacted provider',
          'Resubmitted claim',
          'Filed appeal',
          'Escalated to supervisor',
          'Other'
        ]
      });
    } catch (error) {
      console.error("Error fetching task metadata:", error);
      res.status(500).json({ message: "Failed to fetch metadata" });
    }
  });

  app.get('/api/claims/:id/logs', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const logs = await storage.getActivityLogs(req.params.id, tenantId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.post('/api/claims/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      if (!req.body.note || typeof req.body.note !== 'string' || req.body.note.trim().length === 0) {
        return res.status(400).json({ message: "Note text is required" });
      }
      
      const log = await storage.createActivityLog({
        tenantId,
        claimId: req.params.id,
        userId,
        action: "note_added",
        note: req.body.note.trim(),
        details: req.body.details || {},
      });
      
      res.status(201).json(log);
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ message: "Failed to add note" });
    }
  });

  app.get('/api/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      const includeUserOnly = req.query.userOnly === 'true';
      
      const metrics = await storage.getProductivityMetrics(
        tenantId,
        includeUserOnly ? userId : undefined
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.post('/api/system/generate-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const { updateClaimPriorities, autoGenerateTasks, updateSLAStatus } = await import('./taskGenerator');
      
      const prioritiesUpdated = await updateClaimPriorities(tenantId);
      const tasksCreated = await autoGenerateTasks(tenantId);
      const slaUpdated = await updateSLAStatus(tenantId);
      
      res.json({
        prioritiesUpdated,
        tasksCreated,
        slaUpdated,
      });
    } catch (error) {
      console.error("Error generating tasks:", error);
      res.status(500).json({ message: "Failed to generate tasks" });
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
  });

  app.post('/api/csv-imports', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvImport = await storage.createCsvImport({
        tenantId,
        userId,
        fileName: req.file.originalname,
        status: 'processing',
        totalRows: 0,
        processedRows: 0,
        errorRows: 0,
        columns: [],
      });

      res.json({ importId: csvImport.id, status: 'processing' });

      setImmediate(async () => {
        try {
          const fileContent = req.file.buffer.toString('utf-8');
          const stream = Readable.from(fileContent);
          
          let columns: string[] = [];
          let rowNumber = 0;
          let rowsBatch: any[] = [];
          const batchSize = 1000;

          Papa.parse(stream, {
            header: true,
            skipEmptyLines: 'greedy',
            step: async (result: any, parser: any) => {
              if (rowNumber === 0) {
                columns = result.meta.fields || [];
                storage.updateCsvImport(csvImport.id, tenantId, { columns });
              }

              const hasData = Object.values(result.data).some(
                val => val !== null && val !== undefined && val !== ''
              );
              
              if (hasData) {
                rowNumber++;
                rowsBatch.push({
                  importId: csvImport.id,
                  tenantId,
                  rowNumber,
                  data: result.data,
                });

                if (rowsBatch.length >= batchSize) {
                  parser.pause();
                  await storage.bulkCreateCsvImportRows(rowsBatch);
                  await storage.updateCsvImport(csvImport.id, tenantId, { processedRows: rowNumber });
                  rowsBatch = [];
                  parser.resume();
                }
              }
            },
            complete: async () => {
              if (rowsBatch.length > 0) {
                await storage.bulkCreateCsvImportRows(rowsBatch);
              }

              await storage.updateCsvImport(csvImport.id, tenantId, {
                status: 'completed',
                totalRows: rowNumber,
                processedRows: rowNumber,
                completedAt: new Date(),
              });
            },
            error: async (error: any) => {
              console.error('CSV parsing error:', error);
              await storage.updateCsvImport(csvImport.id, tenantId, {
                status: 'failed',
              });
            },
          });
        } catch (error) {
          console.error('CSV import error:', error);
          await storage.updateCsvImport(csvImport.id, tenantId, {
            status: 'failed',
          });
        }
      });
    } catch (error) {
      console.error("Error uploading CSV:", error);
      res.status(500).json({ message: "Failed to upload CSV" });
    }
  });

  app.get('/api/csv-imports', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const imports = await storage.getCsvImports(tenantId);
      res.json(imports);
    } catch (error) {
      console.error("Error fetching CSV imports:", error);
      res.status(500).json({ message: "Failed to fetch CSV imports" });
    }
  });

  app.get('/api/csv-imports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const csvImport = await storage.getCsvImport(req.params.id, tenantId);
      
      if (!csvImport) {
        return res.status(404).json({ message: "CSV import not found" });
      }
      
      res.json(csvImport);
    } catch (error) {
      console.error("Error fetching CSV import:", error);
      res.status(500).json({ message: "Failed to fetch CSV import" });
    }
  });

  app.get('/api/csv-imports/:id/rows', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const rows = await storage.getCsvImportRows(req.params.id, tenantId, limit, offset);
      const totalCount = await storage.getCsvImportRowCount(req.params.id, tenantId);
      
      res.json({
        rows,
        totalCount,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error fetching CSV import rows:", error);
      res.status(500).json({ message: "Failed to fetch CSV import rows" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
