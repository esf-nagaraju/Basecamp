import { eq, and, desc, sql, gte, lte, or, like, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type Claim,
  type InsertClaim,
  type Task,
  type InsertTask,
  type ActivityLog,
  type InsertActivityLog,
  type CsvImport,
  type InsertCsvImport,
  type CsvImportRow,
  type InsertCsvImportRow,
  type UserTenant,
  type InsertUserTenant,
  type TeamAssignment,
  type InsertTeamAssignment,
  type DailyTarget,
  type InsertDailyTarget,
  type ProductivityMetric,
  type InsertProductivityMetric,
  users,
  tenants,
  claims,
  tasks,
  activityLogs,
  csvImports,
  csvImportRows,
  userTenants,
  teamAssignments,
  dailyTargets,
  productivityMetrics,
  USER_ROLES,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(tenantId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User | undefined>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  getUserTenants(userId: string): Promise<Tenant[]>;
  addUserTenant(userId: string, tenantId: string): Promise<UserTenant>;
  removeUserTenant(userId: string, tenantId: string): Promise<void>;
  
  getClaim(id: string, tenantId: string): Promise<Claim | undefined>;
  getClaims(tenantId: string, filters?: ClaimFilters): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, tenantId: string, updates: Partial<InsertClaim>): Promise<Claim | undefined>;
  bulkCreateClaims(claims: InsertClaim[]): Promise<Claim[]>;
  bulkImportClaimsWithTasks(claims: InsertClaim[], tenantId: string, userId: string, fileName: string): Promise<{ claimsCount: number, tasksCount: number }>;
  
  getTask(id: string, tenantId: string): Promise<Task | undefined>;
  getTasks(tenantId: string, filters?: TaskFilters): Promise<Task[]>;
  getTasksWithDetails(tenantId: string, filters?: TaskFilters): Promise<{ tasks: TaskWithDetails[], totalCount: number }>;
  getTaskWithDetails(id: string, tenantId: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  bulkCreateTasks(tasks: InsertTask[]): Promise<Task[]>;
  generateTasksForTargets(tenantId: string, targetDate: string): Promise<{ tasksCreated: number; claimsCreated: number }>;
  updateTask(id: string, tenantId: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  bulkAssignTasks(taskIds: string[], tenantId: string, assignedTo: string | null): Promise<number>;
  startTaskTimer(id: string, tenantId: string): Promise<Task | undefined>;
  stopTaskTimer(id: string, tenantId: string): Promise<Task | undefined>;
  getTaskSummary(tenantId: string, userId?: string): Promise<TaskSummary>;
  
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(claimId: string, tenantId: string): Promise<ActivityLog[]>;
  
  getProductivityMetrics(tenantId: string, userId?: string): Promise<ProductivityMetrics>;
  getHistoricalProductivity(tenantId: string, startDate: Date, endDate: Date, userId?: string): Promise<DailyProductivityRecord[]>;
  getDailyMetricsSummary(tenantId: string, startDate: Date, endDate: Date): Promise<DailyMetricsSummary[]>;
  
  createCsvImport(csvImport: InsertCsvImport): Promise<CsvImport>;
  updateCsvImport(id: string, tenantId: string, updates: Partial<Omit<CsvImport, 'id' | 'createdAt'>>): Promise<CsvImport | undefined>;
  getCsvImport(id: string, tenantId: string): Promise<CsvImport | undefined>;
  getCsvImports(tenantId: string): Promise<CsvImport[]>;
  bulkCreateCsvImportRows(rows: InsertCsvImportRow[]): Promise<void>;
  getCsvImportRows(importId: string, tenantId: string, limit?: number, offset?: number): Promise<CsvImportRow[]>;
  getCsvImportRowCount(importId: string, tenantId: string): Promise<number>;
  
  getTeamMembers(tenantId: string, filters?: TeamMemberFilters): Promise<TeamMemberWithDetails[]>;
  getTeamAssignment(userId: string, tenantId: string): Promise<TeamAssignment | undefined>;
  upsertTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment>;
  bulkAssignTeamMembers(userIds: string[], region: string | null, payer: string | null, tenantId: string, assignedBy: string): Promise<number>;
  
  getDailyTarget(userId: string, targetDate: string, tenantId: string): Promise<DailyTarget | undefined>;
  getDailyTargets(tenantId: string, targetDate: string): Promise<DailyTarget[]>;
  upsertDailyTarget(target: InsertDailyTarget): Promise<DailyTarget>;
  bulkSetDailyTargets(userIds: string[], claimTarget: number, targetDate: string, tenantId: string, setBy: string, changeReason?: string): Promise<number>;
  
  getProductivityMetricsForDate(userId: string, metricDate: string, tenantId: string): Promise<ProductivityMetric | undefined>;
  getTeamProductivityMetrics(tenantId: string, metricDate: string): Promise<ProductivityMetric[]>;
  updateProductivityMetrics(userId: string, metricDate: string, tenantId: string, metrics: Partial<InsertProductivityMetric>): Promise<ProductivityMetric>;
}

export interface ClaimFilters {
  status?: string | string[];
  assignedTo?: string;
  minAge?: number;
  maxAge?: number;
  minBalance?: number;
  maxBalance?: number;
  payorName?: string;
  search?: string;
  lineOfBusiness?: string | string[];
  criteria?: string | string[];
  team?: string | string[];
  limit?: number;
  offset?: number;
}

export interface TaskFilters {
  status?: string | string[];
  assignedTo?: string | string[];
  claimId?: string;
  priority?: string;
  client?: string;
  search?: string;
  lineOfBusiness?: string | string[];
  criteria?: string | string[];
  team?: string | string[];
  claimNumber?: string | string[];
  riskScore?: string | string[];
  payor?: string | string[];
  limit?: number;
  offset?: number;
}

export interface TaskSummary {
  totalTasks: number;
  myTasks: number;
  pendingTasks: number;
  completedToday: number;
}

export interface TaskWithDetails extends Task {
  claimNumber: string;
  client: string;
  assignedToName: string | null;
  invoiceDate: string | null;
  invoiceAge: number | null;
  invoiceAgeBucket: string | null;
  dateOfService: string | null;
  dosAgeBucket: string | null;
  accurioActionStatus: string | null;
  actionCategory: string | null;
  allowedAmount: string | null;
  billingProvider: string | null;
  dateClaimSent: string | null;
  errorFile: string | null;
  financialClass: string | null;
  fixedDenial: string | null;
  fixedRemarkCode: string | null;
  followUpDays: number | null;
  grossAmount: string | null;
  location: string | null;
  maxCreateDate: string | null;
  nrcContract: string | null;
  payment: string | null;
  payorId: string | null;
  payorType: string | null;
  pfx: string | null;
  renderingProvider: string | null;
  servicingLocation: string | null;
  sfx: string | null;
  totalBalance: string | null;
  writeOffs: string | null;
}

export interface ProductivityMetrics {
  totalClaims: number;
  resolvedClaims: number;
  avgHandleTime: number;
  touchesPerClaim: number;
  totalBalance: number;
}

export interface DailyProductivityRecord {
  date: string;
  userId: string;
  userName: string;
  role: string;
  tasksCompleted: number;
  claimsProcessed: number;
  activitiesLogged: number;
  hoursWorked: number;
  revenueCollected: number;
}

export interface DailyMetricsSummary {
  date: string;
  totalTasks: number;
  totalClaims: number;
  totalActivities: number;
  totalRevenue: number;
  activeUsers: number;
}

export interface TeamMemberFilters {
  region?: string;
  payer?: string;
  status?: string;
  search?: string;
  performanceLevel?: 'high' | 'medium' | 'low';
}

export interface TeamMemberWithDetails {
  userId: string;
  employeeName: string;
  employeeId: string | null;
  email: string | null;
  role: string;
  region: string | null;
  payer: string | null;
  dailyClaimTarget: number;
  claimsProcessedToday: number;
  performancePercent: number;
  status: string;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string, tenantId?: string): Promise<User | undefined> {
    const conditions = [eq(users.username, username)];
    if (tenantId) {
      conditions.push(eq(users.tenantId, tenantId));
    }
    const result = await db.select().from(users).where(and(...conditions)).limit(1);
    return result[0];
  }

  async getUsers(tenantId: string): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));
    
    // Filter out test users by excluding common test patterns
    return allUsers.filter(user => {
      const email = user.email?.toLowerCase() || '';
      const firstName = user.firstName?.toLowerCase() || '';
      const lastName = user.lastName?.toLowerCase() || '';
      const fullName = user.fullName?.toLowerCase() || '';
      
      // Exclude users with test email domains
      if (email.includes('@test.com') || email.includes('@example.com')) {
        return false;
      }
      
      // Exclude users with test-related names
      const testPatterns = ['test', 'tester', 'timer', 'table', 'format', 'sidebar', 'isolation', 'fields', 'transaction'];
      const hasTestPattern = testPatterns.some(pattern => 
        firstName.includes(pattern) || 
        lastName.includes(pattern) || 
        fullName.includes(pattern)
      );
      
      if (hasTestPattern) {
        return false;
      }
      
      return true;
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser & { role?: string }): Promise<User> {
    let defaultTenant = await db
      .select()
      .from(tenants)
      .limit(1);
    
    if (defaultTenant.length === 0) {
      const [newTenant] = await db
        .insert(tenants)
        .values({
          name: 'Default Healthcare Organization',
          settings: {},
        })
        .returning();
      defaultTenant = [newTenant];
    }
    
    const tenantId = defaultTenant[0].id;
    // For new users, default to RCM_SPECIALIST. For existing users, role may be undefined to preserve existing value
    const roleForInsert = userData.role || USER_ROLES.RCM_SPECIALIST;
    
    // Build update object - only include role if explicitly provided (not undefined)
    const updateFields: any = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      fullName: [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email || 'User',
      updatedAt: new Date(),
    };
    
    // Only update role if explicitly provided (preserves existing role when undefined)
    if (userData.role !== undefined) {
      updateFields.role = userData.role;
    }
    
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        replitId: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        fullName: [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email || 'User',
        tenantId: tenantId,
        role: roleForInsert,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: updateFields,
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(tenants.name);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const result = await db.insert(tenants).values(tenant).returning();
    return result[0];
  }

  async getUserTenants(userId: string): Promise<Tenant[]> {
    const result = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        settings: tenants.settings,
        createdAt: tenants.createdAt,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId))
      .orderBy(tenants.name);
    return result;
  }

  async addUserTenant(userId: string, tenantId: string): Promise<UserTenant> {
    const result = await db
      .insert(userTenants)
      .values({ userId, tenantId })
      .returning();
    return result[0];
  }

  async removeUserTenant(userId: string, tenantId: string): Promise<void> {
    await db
      .delete(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async getClaim(id: string, tenantId: string): Promise<Claim | undefined> {
    const result = await db
      .select()
      .from(claims)
      .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getClaims(tenantId: string, filters: ClaimFilters = {}): Promise<Claim[]> {
    const conditions = [eq(claims.tenantId, tenantId)];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(claims.status, filters.status));
      } else {
        conditions.push(eq(claims.status, filters.status));
      }
    }

    if (filters.assignedTo) {
      conditions.push(eq(claims.assignedTo, filters.assignedTo));
    }

    if (filters.minAge !== undefined) {
      conditions.push(gte(claims.invoiceAge, filters.minAge));
    }

    if (filters.maxAge !== undefined) {
      conditions.push(lte(claims.invoiceAge, filters.maxAge));
    }

    if (filters.minBalance !== undefined) {
      conditions.push(gte(claims.balanceDue, filters.minBalance.toString()));
    }

    if (filters.maxBalance !== undefined) {
      conditions.push(lte(claims.balanceDue, filters.maxBalance.toString()));
    }

    if (filters.payorName) {
      conditions.push(like(claims.payorName, `%${filters.payorName}%`));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(claims.customerName, `%${filters.search}%`),
          like(claims.invoiceNumber, `%${filters.search}%`),
          like(claims.payorName, `%${filters.search}%`)
        )!
      );
    }

    if (filters.lineOfBusiness) {
      if (Array.isArray(filters.lineOfBusiness)) {
        conditions.push(inArray(claims.lineOfBusiness, filters.lineOfBusiness));
      } else {
        conditions.push(eq(claims.lineOfBusiness, filters.lineOfBusiness));
      }
    }

    if (filters.criteria) {
      if (Array.isArray(filters.criteria)) {
        conditions.push(inArray(claims.criteria, filters.criteria));
      } else {
        conditions.push(eq(claims.criteria, filters.criteria));
      }
    }

    if (filters.team) {
      if (Array.isArray(filters.team)) {
        conditions.push(inArray(claims.team, filters.team));
      } else {
        conditions.push(eq(claims.team, filters.team));
      }
    }

    let query = db
      .select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.priorityScore), desc(claims.invoiceAge));

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const result = await db.insert(claims).values(claim).returning();
    return result[0];
  }

  async updateClaim(
    id: string,
    tenantId: string,
    updates: Partial<InsertClaim>
  ): Promise<Claim | undefined> {
    const result = await db
      .update(claims)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(claims.id, id), eq(claims.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async bulkCreateClaims(claimsList: InsertClaim[]): Promise<Claim[]> {
    if (claimsList.length === 0) return [];
    
    const tenantIds = new Set(claimsList.map(c => c.tenantId));
    if (tenantIds.size > 1) {
      throw new Error("All claims must belong to the same tenant");
    }
    
    const batchSize = 1000;
    const allResults: Claim[] = [];
    
    for (let i = 0; i < claimsList.length; i += batchSize) {
      const batch = claimsList.slice(i, i + batchSize);
      const result = await db.insert(claims).values(batch).returning();
      allResults.push(...result);
    }
    
    return allResults;
  }

  async bulkImportClaimsWithTasks(
    claimsList: InsertClaim[],
    tenantId: string,
    userId: string,
    fileName: string
  ): Promise<{ claimsCount: number, tasksCount: number }> {
    if (claimsList.length === 0) {
      return { claimsCount: 0, tasksCount: 0 };
    }
    
    const tenantIds = new Set(claimsList.map(c => c.tenantId));
    if (tenantIds.size > 1) {
      throw new Error("All claims must belong to the same tenant");
    }
    
    if (!tenantIds.has(tenantId)) {
      throw new Error("Claims tenant ID does not match provided tenant ID");
    }
    
    return await db.transaction(async (tx) => {
      const batchSize = 1000;
      const allClaims: Claim[] = [];
      
      for (let i = 0; i < claimsList.length; i += batchSize) {
        const batch = claimsList.slice(i, i + batchSize);
        const result = await tx.insert(claims).values(batch).returning();
        allClaims.push(...result);
      }
      
      const taskData = allClaims.map(claim => ({
        tenantId,
        claimId: claim.id!,
        title: `Process claim ${claim.invoiceNumber}`,
        priority: 'medium' as const,
        status: 'pending' as const,
        progressPercent: 0,
      }));
      
      const allTasks: Task[] = [];
      for (let i = 0; i < taskData.length; i += batchSize) {
        const batch = taskData.slice(i, i + batchSize);
        const result = await tx.insert(tasks).values(batch).returning();
        allTasks.push(...result);
      }
      
      await tx.insert(activityLogs).values({
        tenantId,
        userId,
        action: "csv_import",
        details: {
          fileName,
          claimsImported: allClaims.length,
          tasksCreated: allTasks.length
        },
      });
      
      return {
        claimsCount: allClaims.length,
        tasksCount: allTasks.length
      };
    });
  }

  async getTask(id: string, tenantId: string): Promise<Task | undefined> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getTasks(tenantId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const conditions = [eq(tasks.tenantId, tenantId)];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(tasks.status, filters.status));
      } else {
        conditions.push(eq(tasks.status, filters.status));
      }
    }

    if (filters.assignedTo) {
      if (Array.isArray(filters.assignedTo)) {
        conditions.push(inArray(tasks.assignedTo, filters.assignedTo));
      } else {
        conditions.push(eq(tasks.assignedTo, filters.assignedTo));
      }
    }

    if (filters.claimId) {
      conditions.push(eq(tasks.claimId, filters.claimId));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    return await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const claim = await this.getClaim(task.claimId, task.tenantId);
    if (!claim) {
      throw new Error("Claim not found or does not belong to tenant");
    }
    
    if (task.assignedTo) {
      const user = await this.getUser(task.assignedTo);
      if (!user || user.tenantId !== task.tenantId) {
        throw new Error("Assigned user not found or does not belong to tenant");
      }
    }
    
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async bulkCreateTasks(tasksList: InsertTask[]): Promise<Task[]> {
    if (tasksList.length === 0) return [];
    
    const tenantIds = new Set(tasksList.map(t => t.tenantId));
    if (tenantIds.size > 1) {
      throw new Error("All tasks must belong to the same tenant");
    }
    
    const batchSize = 1000;
    const allResults: Task[] = [];
    
    for (let i = 0; i < tasksList.length; i += batchSize) {
      const batch = tasksList.slice(i, i + batchSize);
      const result = await db.insert(tasks).values(batch).returning();
      allResults.push(...result);
    }
    
    return allResults;
  }

  async generateTasksForTargets(tenantId: string, targetDate: string): Promise<{ tasksCreated: number; claimsCreated: number }> {
    // Get targets and productivity metrics
    const targets = await this.getDailyTargets(tenantId, targetDate);
    const productivityMetrics = await this.getTeamProductivityMetrics(tenantId, targetDate);
    
    if (targets.length === 0) {
      return { tasksCreated: 0, claimsCreated: 0 };
    }
    
    // Build distribution based on per-user remaining targets
    // Iterate over targets to ensure we include ALL users with targets (even inactive ones)
    const processedMap = new Map(productivityMetrics.map(m => [m.userId, m.claimsProcessedToday || 0]));
    
    const distribution: Array<{ userId: string; count: number }> = [];
    let tasksToCreate = 0;
    
    for (const target of targets) {
      const processed = processedMap.get(target.userId) || 0;
      const remaining = Math.max(0, target.claimTarget - processed);
      if (remaining > 0) {
        distribution.push({ userId: target.userId, count: remaining });
        tasksToCreate += remaining;
      }
    }
    
    // Exit early if no tasks needed (all users at or above target)
    if (tasksToCreate <= 0) {
      return { tasksCreated: 0, claimsCreated: 0 };
    }
    
    // Metadata for realistic generation
    const metadata = {
      resolutionCategories: ['Claim Approved', 'Claim Denied', 'Claim Pending', 'Information Requested', 'Appeal Filed', 'Payment Received', 'Other'],
      rootCauseCategories: ['Additional Information Requested', 'Authorization', 'Billing Error', 'Bundling/Inclusive Service', 'Claim is in Process', 'Coding', 'Demographics Issue', 'Eligibility/Benefits', 'No Response', 'Non-Covered', 'NPI/Non Par/Out of Network', 'Paid According to Contract', 'Patient Responsibility', 'Payment Issue', 'Referral', 'Timely Filing'],
      actionCategories: ['Status check', 'Payment - To be Posted', 'Resubmit'],
      actionStatuses: {
        'Status check': ['Appeal: Appeal In Process - 1', 'No Action Taken: Claim In Process', 'Payment to be Posted', 'Write Off: Timely Filing'],
        'Payment - To be Posted': ['No Action Taken: Payment Posted Prior to Status Check', 'Claim Completed/Settled'],
        'Resubmit': ['Reprocessing: Coding Related Denial', 'Resubmission: Claim Not on File - All Info Correct', 'Resubmission: Denial - Sent Appeal 1']
      },
      followUpDays: {
        'Status check::Appeal: Appeal In Process - 1': 28,
        'Status check::No Action Taken: Claim In Process': 28,
        'Status check::Payment to be Posted': 7,
        'Status check::Write Off: Timely Filing': 0,
        'Payment - To be Posted::No Action Taken: Payment Posted Prior to Status Check': 0,
        'Payment - To be Posted::Claim Completed/Settled': 0,
        'Resubmit::Reprocessing: Coding Related Denial': 28,
        'Resubmit::Resubmission: Claim Not on File - All Info Correct': 28,
        'Resubmit::Resubmission: Denial - Sent Appeal 1': 28
      },
      payorNames: ['Medicare', 'Medicaid', 'Blue Cross Blue Shield', 'Aetna', 'United Healthcare', 'Cigna', 'Humana', 'Anthem', 'Tricare', 'Commercial Insurance'],
      payorTypes: ['Medicare', 'Medicaid', 'Commercial', 'Federal', 'Managed Care'],
      linesOfBusiness: ['External', 'INR/Medicaid (Offshore)', 'Commercial (Offshore)', 'Commercial (Onshore)', 'Medicare (Onshore)', 'Medicare Advantage (Onshore)'],
      criteria: ['CPR+', 'Silent Payors, 34 States', 'Permission Needed, Yes, Granted Yes', 'Medicare', 'Commercial'],
      teams: ['Acuserve', 'Accurio', 'Lincare', 'TP India', 'TP Manila']
    };
    
    // Helper functions for random selection
    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomDecimal = (min: number, max: number) => (Math.random() * (max - min) + min).toFixed(2);
    
    const claimsToCreate: InsertClaim[] = [];
    const tasksToCreateList: InsertTask[] = [];
    
    // Generate claims and tasks
    let taskIndex = 0;
    for (const { userId, count } of distribution) {
      for (let i = 0; i < count && taskIndex < tasksToCreate; i++, taskIndex++) {
        const actionCategory = random(metadata.actionCategories);
        const actionStatus = random(metadata.actionStatuses[actionCategory as keyof typeof metadata.actionStatuses]);
        const followUpKey = `${actionCategory}::${actionStatus}`;
        const followUpDays = (metadata.followUpDays as any)[followUpKey] || 7;
        
        const invoiceAge = randomInt(30, 365);
        const invoiceAgeBucket = invoiceAge < 30 ? '0-30' : invoiceAge < 60 ? '31-60' : invoiceAge < 90 ? '61-90' : '91+';
        
        const claim: InsertClaim = {
          tenantId,
          customerId: `CUST-${randomInt(10000, 99999)}`,
          customerName: `Patient ${randomInt(1000, 9999)}`,
          dob: `19${randomInt(40, 90)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          insuredId: `INS-${randomInt(100000, 999999)}`,
          payorGroup: random(['Group A', 'Group B', 'Group C']),
          payorCode: `PC${randomInt(100, 999)}`,
          payorName: random(metadata.payorNames),
          payorType: random(metadata.payorTypes),
          listPrice: randomDecimal(200, 15000),
          allowedAmount: randomDecimal(150, 12000),
          dueAmount: randomDecimal(100, 10000),
          appliedAmount: randomDecimal(50, 8000),
          balanceDue: randomDecimal(100, 10000),
          invoiceNumber: `INV-${Date.now()}-${taskIndex}`,
          invoiceDate: targetDate,
          invoiceAge,
          invoiceAgeBucket,
          dateOfService: targetDate,
          dosAgeBucket: invoiceAgeBucket,
          hcpcCode: `${randomInt(10000, 99999)}`,
          status: actionStatus,
          slaStatus: random(['green', 'yellow', 'red']),
          denialCodes: [],
          assignedTo: userId,
          priorityScore: randomInt(1, 10),
          lineOfBusiness: random(metadata.linesOfBusiness),
          criteria: random(metadata.criteria),
          team: random(metadata.teams),
          actionCategory,
          billingProvider: `Provider ${randomInt(1, 50)}`,
          dateClaimSent: targetDate,
          financialClass: random(['Commercial', 'Medicare', 'Medicaid', 'Self-Pay']),
          followUpDays,
          grossAmount: randomDecimal(200, 15000),
          location: random(['Location A', 'Location B', 'Location C', 'Location D']),
          payment: randomDecimal(100, 10000),
          payorId: `PID-${randomInt(1000, 9999)}`,
          renderingProvider: `Dr. ${randomInt(1, 100)}`,
          servicingLocation: random(['Facility 1', 'Facility 2', 'Facility 3'])
        };
        
        claimsToCreate.push(claim);
      }
    }
    
    // Bulk create claims
    const createdClaims = await this.bulkCreateClaims(claimsToCreate);
    
    // Create tasks for each claim
    let claimIdx = 0;
    for (const { userId, count } of distribution) {
      for (let i = 0; i < count && claimIdx < createdClaims.length; i++, claimIdx++) {
        const claim = createdClaims[claimIdx];
        const resolutionCategory = random(metadata.resolutionCategories);
        const rootCauseCategory = random(metadata.rootCauseCategories);
        
        tasksToCreateList.push({
          tenantId,
          claimId: claim.id!,
          assignedTo: userId,
          title: `Review Claim ${claim.invoiceNumber}`,
          description: `Follow up on claim ${claim.invoiceNumber} for ${claim.customerName}`,
          priority: String(claim.priorityScore),
          status: 'completed',
          resolutionCategory,
          rootCauseCategory,
          resolutionAction: random(['Submitted additional documentation', 'Corrected coding', 'Resubmitted claim', 'Filed appeal']),
          completedAt: new Date(targetDate)
        });
      }
    }
    
    // Bulk create tasks
    const createdTasks = await this.bulkCreateTasks(tasksToCreateList);
    
    // Update productivity metrics
    for (const { userId, count } of distribution) {
      const existing = await this.getProductivityMetricsForDate(userId, targetDate, tenantId);
      const newClaimsProcessed = (existing?.claimsProcessedToday || 0) + count;
      const newClaimsPending = Math.max(0, (existing?.claimsPending || 0) - count);
      
      await this.updateProductivityMetrics(userId, targetDate, tenantId, {
        claimsProcessedToday: newClaimsProcessed,
        claimsPending: newClaimsPending
      });
    }
    
    return { tasksCreated: createdTasks.length, claimsCreated: createdClaims.length };
  }

  async updateTask(
    id: string,
    tenantId: string,
    updates: Partial<InsertTask>
  ): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async bulkAssignTasks(
    taskIds: string[],
    tenantId: string,
    assignedTo: string | null
  ): Promise<number> {
    const result = await db
      .update(tasks)
      .set({ assignedTo, updatedAt: new Date() })
      .where(and(
        inArray(tasks.id, taskIds),
        eq(tasks.tenantId, tenantId)
      ))
      .returning({ id: tasks.id });
    return result.length;
  }

  async getTasksWithDetails(tenantId: string, filters: TaskFilters = {}): Promise<{ tasks: TaskWithDetails[], totalCount: number }> {
    const conditions = [eq(tasks.tenantId, tenantId)];

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(inArray(tasks.status, filters.status));
      } else {
        conditions.push(eq(tasks.status, filters.status));
      }
    }

    if (filters.assignedTo) {
      if (Array.isArray(filters.assignedTo)) {
        conditions.push(inArray(tasks.assignedTo, filters.assignedTo));
      } else {
        conditions.push(eq(tasks.assignedTo, filters.assignedTo));
      }
    }

    if (filters.claimId) {
      conditions.push(eq(tasks.claimId, filters.claimId));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters.client) {
      conditions.push(like(claims.payorName, `%${filters.client}%`));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(claims.invoiceNumber, `%${filters.search}%`),
          like(claims.payorName, `%${filters.search}%`)
        )!
      );
    }

    if (filters.lineOfBusiness && filters.lineOfBusiness.length > 0) {
      const values = Array.isArray(filters.lineOfBusiness) ? filters.lineOfBusiness : [filters.lineOfBusiness];
      conditions.push(inArray(claims.lineOfBusiness, values));
    }

    if (filters.criteria && filters.criteria.length > 0) {
      const values = Array.isArray(filters.criteria) ? filters.criteria : [filters.criteria];
      conditions.push(inArray(claims.criteria, values));
    }

    if (filters.team && filters.team.length > 0) {
      const values = Array.isArray(filters.team) ? filters.team : [filters.team];
      conditions.push(inArray(claims.team, values));
    }

    if (filters.claimNumber && filters.claimNumber.length > 0) {
      const values = Array.isArray(filters.claimNumber) ? filters.claimNumber : [filters.claimNumber];
      conditions.push(inArray(claims.invoiceNumber, values));
    }

    if (filters.riskScore && filters.riskScore.length > 0) {
      const values = Array.isArray(filters.riskScore) ? filters.riskScore : [filters.riskScore];
      conditions.push(inArray(tasks.priority, values));
    }

    if (filters.payor && filters.payor.length > 0) {
      const values = Array.isArray(filters.payor) ? filters.payor : [filters.payor];
      conditions.push(inArray(claims.payorName, values));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .innerJoin(claims, eq(tasks.claimId, claims.id))
      .where(and(...conditions));

    const totalCount = Number(countResult[0]?.count || 0);

    let query = db
      .select({
        id: tasks.id,
        tenantId: tasks.tenantId,
        claimId: tasks.claimId,
        assignedTo: tasks.assignedTo,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        dueDate: tasks.dueDate,
        resolutionCategory: tasks.resolutionCategory,
        rootCauseCategory: tasks.rootCauseCategory,
        rootCauseDetail: tasks.rootCauseDetail,
        resolutionAction: tasks.resolutionAction,
        notes: tasks.notes,
        progressPercent: tasks.progressPercent,
        totalTimeSeconds: tasks.totalTimeSeconds,
        activeTimerStartedAt: tasks.activeTimerStartedAt,
        startedAt: tasks.startedAt,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        claimNumber: claims.invoiceNumber,
        client: claims.payorName,
        assignedToName: users.fullName,
        invoiceDate: claims.invoiceDate,
        invoiceAge: claims.invoiceAge,
        invoiceAgeBucket: claims.invoiceAgeBucket,
        dateOfService: claims.dateOfService,
        dosAgeBucket: claims.dosAgeBucket,
        accurioActionStatus: claims.status,
        actionCategory: claims.actionCategory,
        allowedAmount: claims.allowedAmount,
        billingProvider: claims.billingProvider,
        dateClaimSent: claims.dateClaimSent,
        errorFile: claims.errorFile,
        financialClass: claims.financialClass,
        fixedDenial: claims.fixedDenial,
        fixedRemarkCode: claims.fixedRemarkCode,
        followUpDays: claims.followUpDays,
        grossAmount: claims.grossAmount,
        location: claims.location,
        maxCreateDate: claims.maxCreateDate,
        nrcContract: claims.nrcContract,
        payment: claims.payment,
        payorId: claims.payorId,
        payorType: claims.payorType,
        pfx: claims.pfx,
        renderingProvider: claims.renderingProvider,
        servicingLocation: claims.servicingLocation,
        sfx: claims.sfx,
        totalBalance: claims.balanceDue,
        writeOffs: claims.writeOffs,
        lineOfBusiness: claims.lineOfBusiness,
        criteria: claims.criteria,
        team: claims.team,
      })
      .from(tasks)
      .innerJoin(claims, eq(tasks.claimId, claims.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as any;
    }

    const results = await query;

    return {
      tasks: results as TaskWithDetails[],
      totalCount,
    };
  }

  async getTaskWithDetails(id: string, tenantId: string): Promise<TaskWithDetails | undefined> {
    const result = await db
      .select({
        id: tasks.id,
        tenantId: tasks.tenantId,
        claimId: tasks.claimId,
        assignedTo: tasks.assignedTo,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        dueDate: tasks.dueDate,
        resolutionCategory: tasks.resolutionCategory,
        rootCauseCategory: tasks.rootCauseCategory,
        rootCauseDetail: tasks.rootCauseDetail,
        resolutionAction: tasks.resolutionAction,
        notes: tasks.notes,
        progressPercent: tasks.progressPercent,
        totalTimeSeconds: tasks.totalTimeSeconds,
        activeTimerStartedAt: tasks.activeTimerStartedAt,
        startedAt: tasks.startedAt,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        claimNumber: claims.invoiceNumber,
        client: claims.payorName,
        assignedToName: users.fullName,
        invoiceDate: claims.invoiceDate,
        invoiceAge: claims.invoiceAge,
        invoiceAgeBucket: claims.invoiceAgeBucket,
        dateOfService: claims.dateOfService,
        dosAgeBucket: claims.dosAgeBucket,
        accurioActionStatus: claims.status,
        actionCategory: claims.actionCategory,
        allowedAmount: claims.allowedAmount,
        billingProvider: claims.billingProvider,
        dateClaimSent: claims.dateClaimSent,
        errorFile: claims.errorFile,
        financialClass: claims.financialClass,
        fixedDenial: claims.fixedDenial,
        fixedRemarkCode: claims.fixedRemarkCode,
        followUpDays: claims.followUpDays,
        grossAmount: claims.grossAmount,
        location: claims.location,
        maxCreateDate: claims.maxCreateDate,
        nrcContract: claims.nrcContract,
        payment: claims.payment,
        payorId: claims.payorId,
        payorType: claims.payorType,
        pfx: claims.pfx,
        renderingProvider: claims.renderingProvider,
        servicingLocation: claims.servicingLocation,
        sfx: claims.sfx,
        totalBalance: claims.balanceDue,
        writeOffs: claims.writeOffs,
        lineOfBusiness: claims.lineOfBusiness,
        criteria: claims.criteria,
        team: claims.team,
      })
      .from(tasks)
      .innerJoin(claims, eq(tasks.claimId, claims.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .limit(1);

    return result[0] as TaskWithDetails | undefined;
  }

  async startTaskTimer(id: string, tenantId: string): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({ 
        activeTimerStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async stopTaskTimer(id: string, tenantId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, tenantId);
    if (!task || !task.activeTimerStartedAt) {
      return task;
    }

    const elapsedSeconds = Math.floor((Date.now() - task.activeTimerStartedAt.getTime()) / 1000);
    const newTotalSeconds = (task.totalTimeSeconds || 0) + elapsedSeconds;

    const result = await db
      .update(tasks)
      .set({
        totalTimeSeconds: newTotalSeconds,
        activeTimerStartedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async getTaskSummary(tenantId: string, userId?: string): Promise<TaskSummary> {
    const totalTasksQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId));

    const myTasksQuery = userId
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(and(eq(tasks.tenantId, tenantId), eq(tasks.assignedTo, userId)))
      : Promise.resolve([{ count: 0 }]);

    const pendingTasksQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), eq(tasks.status, 'Pending')));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const completedTodayQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.tenantId, tenantId),
          eq(tasks.status, 'Completed'),
          sql`${tasks.completedAt} >= ${today}`,
          sql`${tasks.completedAt} < ${tomorrow}`
        )
      );

    const [totalResult, myResult, pendingResult, completedResult] = await Promise.all([
      totalTasksQuery,
      myTasksQuery,
      pendingTasksQuery,
      completedTodayQuery,
    ]);

    return {
      totalTasks: totalResult[0]?.count || 0,
      myTasks: myResult[0]?.count || 0,
      pendingTasks: pendingResult[0]?.count || 0,
      completedToday: completedResult[0]?.count || 0,
    };
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const user = await this.getUser(log.userId);
    if (!user || user.tenantId !== log.tenantId) {
      throw new Error("User not found or does not belong to tenant");
    }
    
    if (log.claimId) {
      const claim = await this.getClaim(log.claimId, log.tenantId);
      if (!claim) {
        throw new Error("Claim not found or does not belong to tenant");
      }
    }
    
    if (log.taskId) {
      const task = await this.getTask(log.taskId, log.tenantId);
      if (!task) {
        throw new Error("Task not found or does not belong to tenant");
      }
    }
    
    const result = await db.insert(activityLogs).values(log).returning();
    return result[0];
  }

  async getActivityLogs(claimId: string, tenantId: string): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(and(eq(activityLogs.claimId, claimId), eq(activityLogs.tenantId, tenantId)))
      .orderBy(desc(activityLogs.createdAt));
  }

  async getProductivityMetrics(
    tenantId: string,
    userId?: string
  ): Promise<ProductivityMetrics> {
    const conditions = [eq(claims.tenantId, tenantId)];
    if (userId) {
      conditions.push(eq(claims.assignedTo, userId));
    }

    const totalClaimsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(...conditions));

    const resolvedClaimsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(
        and(
          ...conditions,
          inArray(claims.status, ["paid", "partially_paid", "closed", "write_off"])
        )
      );

    const balanceResult = await db
      .select({ total: sql<number>`sum(CAST(${claims.balanceDue} AS DECIMAL))` })
      .from(claims)
      .where(and(...conditions));

    const activityConditions = [eq(activityLogs.tenantId, tenantId)];
    if (userId) {
      activityConditions.push(eq(activityLogs.userId, userId));
    }

    const activityCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(and(...activityConditions));

    const totalClaims = Number(totalClaimsResult[0]?.count || 0);
    const resolvedClaims = Number(resolvedClaimsResult[0]?.count || 0);
    const totalBalance = Number(balanceResult[0]?.total || 0);
    const activityCount = Number(activityCountResult[0]?.count || 0);

    return {
      totalClaims,
      resolvedClaims,
      avgHandleTime: totalClaims > 0 ? Math.round((activityCount / totalClaims) * 15) : 0,
      touchesPerClaim: totalClaims > 0 ? Math.round(activityCount / totalClaims * 10) / 10 : 0,
      totalBalance,
    };
  }

  async getHistoricalProductivity(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<DailyProductivityRecord[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const metricsConditions = [
      eq(productivityMetrics.tenantId, tenantId),
      gte(productivityMetrics.metricDate, startDateStr),
      lte(productivityMetrics.metricDate, endDateStr)
    ];
    
    if (userId) {
      metricsConditions.push(eq(productivityMetrics.userId, userId));
    }

    const results = await db
      .select({
        date: productivityMetrics.metricDate,
        userId: productivityMetrics.userId,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        role: users.role,
        claimsProcessed: productivityMetrics.claimsProcessedToday,
        claimsPending: productivityMetrics.claimsPending,
        avgHandlingTime: productivityMetrics.avgHandlingTimeMinutes,
        accuracyRate: productivityMetrics.accuracyRate,
      })
      .from(productivityMetrics)
      .innerJoin(users, eq(productivityMetrics.userId, users.id))
      .where(and(...metricsConditions))
      .orderBy(desc(productivityMetrics.metricDate));

    return results.map(row => ({
      date: row.date,
      userId: row.userId,
      userName: row.userName,
      role: row.role,
      tasksCompleted: row.claimsProcessed || 0,
      claimsProcessed: row.claimsProcessed || 0,
      activitiesLogged: row.claimsProcessed || 0,
      hoursWorked: row.avgHandlingTime && row.claimsProcessed 
        ? Number((Number(row.avgHandlingTime) * row.claimsProcessed / 60).toFixed(2))
        : 0,
      revenueCollected: 0,
    }));
  }

  async getDailyMetricsSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetricsSummary[]> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const results = await db
      .select({
        date: productivityMetrics.metricDate,
        totalClaims: sql<number>`SUM(${productivityMetrics.claimsProcessedToday})`,
        totalPending: sql<number>`SUM(${productivityMetrics.claimsPending})`,
        activeUsers: sql<number>`COUNT(DISTINCT ${productivityMetrics.userId})`,
      })
      .from(productivityMetrics)
      .where(
        and(
          eq(productivityMetrics.tenantId, tenantId),
          gte(productivityMetrics.metricDate, startDateStr),
          lte(productivityMetrics.metricDate, endDateStr)
        )
      )
      .groupBy(productivityMetrics.metricDate)
      .orderBy(productivityMetrics.metricDate);

    return results.map(row => ({
      date: row.date,
      totalTasks: Number(row.totalClaims) || 0,
      totalClaims: Number(row.totalClaims) || 0,
      totalActivities: Number(row.totalClaims) || 0,
      totalRevenue: 0,
      activeUsers: Number(row.activeUsers) || 0,
    }));
  }

  async createCsvImport(csvImport: InsertCsvImport): Promise<CsvImport> {
    const result = await db.insert(csvImports).values(csvImport).returning();
    return result[0];
  }

  async updateCsvImport(id: string, tenantId: string, updates: Partial<Omit<CsvImport, 'id' | 'createdAt'>>): Promise<CsvImport | undefined> {
    const result = await db
      .update(csvImports)
      .set(updates)
      .where(and(eq(csvImports.id, id), eq(csvImports.tenantId, tenantId)))
      .returning();
    return result[0];
  }

  async getCsvImport(id: string, tenantId: string): Promise<CsvImport | undefined> {
    const result = await db
      .select()
      .from(csvImports)
      .where(and(eq(csvImports.id, id), eq(csvImports.tenantId, tenantId)))
      .limit(1);
    return result[0];
  }

  async getCsvImports(tenantId: string): Promise<CsvImport[]> {
    return await db
      .select()
      .from(csvImports)
      .where(eq(csvImports.tenantId, tenantId))
      .orderBy(desc(csvImports.createdAt));
  }

  async bulkCreateCsvImportRows(rows: InsertCsvImportRow[]): Promise<void> {
    if (rows.length === 0) return;
    
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.insert(csvImportRows).values(batch);
    }
  }

  async getCsvImportRows(importId: string, tenantId: string, limit: number = 50, offset: number = 0): Promise<CsvImportRow[]> {
    return await db
      .select()
      .from(csvImportRows)
      .where(and(eq(csvImportRows.importId, importId), eq(csvImportRows.tenantId, tenantId)))
      .orderBy(csvImportRows.rowNumber)
      .limit(limit)
      .offset(offset);
  }

  async getCsvImportRowCount(importId: string, tenantId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(csvImportRows)
      .where(and(eq(csvImportRows.importId, importId), eq(csvImportRows.tenantId, tenantId)));
    return Number(result[0]?.count || 0);
  }

  async getTeamMembers(tenantId: string, filters: TeamMemberFilters = {}): Promise<TeamMemberWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const query = db
      .select({
        userId: users.id,
        employeeName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        employeeId: teamAssignments.employeeId,
        email: users.email,
        role: users.role,
        region: teamAssignments.region,
        payer: teamAssignments.payer,
        dailyClaimTarget: sql<number>`COALESCE(${dailyTargets.claimTarget}, 0)`,
        claimsProcessedToday: sql<number>`COALESCE(${productivityMetrics.claimsProcessedToday}, 0)`,
        status: teamAssignments.status,
      })
      .from(users)
      .innerJoin(teamAssignments, and(
        eq(teamAssignments.userId, users.id),
        eq(teamAssignments.tenantId, tenantId),
        eq(teamAssignments.status, 'active')
      ))
      .leftJoin(dailyTargets, and(
        eq(dailyTargets.userId, users.id),
        eq(dailyTargets.tenantId, tenantId),
        eq(dailyTargets.targetDate, today)
      ))
      .leftJoin(productivityMetrics, and(
        eq(productivityMetrics.userId, users.id),
        eq(productivityMetrics.tenantId, tenantId),
        eq(productivityMetrics.metricDate, today)
      ))
      .where(and(
        eq(users.tenantId, tenantId),
        or(
          eq(users.role, USER_ROLES.RCM_SPECIALIST),
          eq(users.role, USER_ROLES.AUDITOR)
        )
      ));

    const results = await query;
    
    return results.map(row => ({
      userId: row.userId,
      employeeName: row.employeeName,
      employeeId: row.employeeId,
      email: row.email,
      role: row.role,
      region: row.region,
      payer: row.payer,
      dailyClaimTarget: row.dailyClaimTarget,
      claimsProcessedToday: row.claimsProcessedToday,
      performancePercent: row.dailyClaimTarget > 0 
        ? Math.round((row.claimsProcessedToday / row.dailyClaimTarget) * 100)
        : 0,
      status: row.status,
    })).filter(member => {
      if (filters.region && member.region !== filters.region) return false;
      if (filters.payer && member.payer !== filters.payer) return false;
      if (filters.status && member.status !== filters.status) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          member.employeeName.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower) ||
          member.employeeId?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.performanceLevel) {
        const percent = member.performancePercent;
        if (filters.performanceLevel === 'high' && percent < 100) return false;
        if (filters.performanceLevel === 'medium' && (percent < 80 || percent >= 100)) return false;
        if (filters.performanceLevel === 'low' && percent >= 80) return false;
      }
      return true;
    });
  }

  async getTeamAssignment(userId: string, tenantId: string): Promise<TeamAssignment | undefined> {
    const result = await db
      .select()
      .from(teamAssignments)
      .where(and(
        eq(teamAssignments.userId, userId),
        eq(teamAssignments.tenantId, tenantId),
        eq(teamAssignments.status, 'active')
      ))
      .limit(1);
    return result[0];
  }

  async upsertTeamAssignment(assignment: InsertTeamAssignment): Promise<TeamAssignment> {
    const existing = await this.getTeamAssignment(assignment.userId, assignment.tenantId);
    
    if (existing) {
      const result = await db
        .update(teamAssignments)
        .set({
          region: assignment.region,
          payer: assignment.payer,
          employeeId: assignment.employeeId,
          assignedBy: assignment.assignedBy,
          assignedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(teamAssignments.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(teamAssignments)
        .values(assignment)
        .returning();
      return result[0];
    }
  }

  async bulkAssignTeamMembers(
    userIds: string[], 
    region: string | null, 
    payer: string | null, 
    tenantId: string, 
    assignedBy: string
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    let count = 0;
    for (const userId of userIds) {
      await this.upsertTeamAssignment({
        userId,
        tenantId,
        region,
        payer,
        assignedBy,
        status: 'active',
      });
      count++;
    }
    return count;
  }

  async getDailyTarget(userId: string, targetDate: string, tenantId: string): Promise<DailyTarget | undefined> {
    const result = await db
      .select()
      .from(dailyTargets)
      .where(and(
        eq(dailyTargets.userId, userId),
        eq(dailyTargets.targetDate, targetDate),
        eq(dailyTargets.tenantId, tenantId)
      ))
      .limit(1);
    return result[0];
  }

  async getDailyTargets(tenantId: string, targetDate: string): Promise<DailyTarget[]> {
    return await db
      .select()
      .from(dailyTargets)
      .where(and(
        eq(dailyTargets.tenantId, tenantId),
        eq(dailyTargets.targetDate, targetDate)
      ));
  }

  async upsertDailyTarget(target: InsertDailyTarget): Promise<DailyTarget> {
    const existing = await this.getDailyTarget(target.userId, target.targetDate, target.tenantId);
    
    if (existing) {
      const result = await db
        .update(dailyTargets)
        .set({
          claimTarget: target.claimTarget,
          previousTarget: existing.claimTarget,
          changeReason: target.changeReason,
          setBy: target.setBy,
          setAt: sql`now()`,
        })
        .where(eq(dailyTargets.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(dailyTargets)
        .values(target)
        .returning();
      return result[0];
    }
  }

  async bulkSetDailyTargets(
    userIds: string[], 
    claimTarget: number, 
    targetDate: string, 
    tenantId: string, 
    setBy: string,
    changeReason?: string
  ): Promise<number> {
    if (userIds.length === 0) return 0;

    let count = 0;
    for (const userId of userIds) {
      await this.upsertDailyTarget({
        userId,
        tenantId,
        targetDate,
        claimTarget,
        setBy,
        changeReason,
      });
      count++;
    }
    return count;
  }

  async getProductivityMetricsForDate(userId: string, metricDate: string, tenantId: string): Promise<ProductivityMetric | undefined> {
    const result = await db
      .select()
      .from(productivityMetrics)
      .where(and(
        eq(productivityMetrics.userId, userId),
        eq(productivityMetrics.metricDate, metricDate),
        eq(productivityMetrics.tenantId, tenantId)
      ))
      .limit(1);
    return result[0];
  }

  async getTeamProductivityMetrics(tenantId: string, metricDate: string): Promise<ProductivityMetric[]> {
    return await db
      .select()
      .from(productivityMetrics)
      .where(and(
        eq(productivityMetrics.tenantId, tenantId),
        eq(productivityMetrics.metricDate, metricDate)
      ));
  }

  async updateProductivityMetrics(
    userId: string, 
    metricDate: string, 
    tenantId: string, 
    metrics: Partial<InsertProductivityMetric>
  ): Promise<ProductivityMetric> {
    const existing = await this.getProductivityMetricsForDate(userId, metricDate, tenantId);
    
    if (existing) {
      const result = await db
        .update(productivityMetrics)
        .set({
          ...metrics,
          lastUpdated: sql`now()`,
        })
        .where(eq(productivityMetrics.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(productivityMetrics)
        .values({
          userId,
          tenantId,
          metricDate,
          ...metrics,
        })
        .returning();
      return result[0];
    }
  }
}

export const storage = new DbStorage();
