import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClaimSchema, insertTaskSchema, insertActivityLogSchema } from "@shared/schema";
import { z } from "zod";

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

async function getUserContext(req: any): Promise<{ userId: string; tenantId: string }> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return {
    userId,
    tenantId: user.tenantId,
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
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
                             'invoiceStatus', 'denialCodes', 'lastDenialDate', 'priorityScore', 'note'];
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

  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserContext(req);
      
      const filters = {
        status: req.query.status as string,
        assignedTo: req.query.assignedTo as string,
        claimId: req.query.claimId as string,
        priority: req.query.priority as string,
      };

      const tasks = await storage.getTasks(tenantId, filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
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

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserContext(req);
      
      const allowedFields = ['status', 'assignedTo', 'title', 'description', 'priority', 'dueDate'];
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

  const httpServer = createServer(app);

  return httpServer;
}
