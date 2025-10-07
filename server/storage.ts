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
  users,
  tenants,
  claims,
  tasks,
  activityLogs,
  csvImports,
  csvImportRows,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  getClaim(id: string, tenantId: string): Promise<Claim | undefined>;
  getClaims(tenantId: string, filters?: ClaimFilters): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, tenantId: string, updates: Partial<InsertClaim>): Promise<Claim | undefined>;
  bulkCreateClaims(claims: InsertClaim[]): Promise<Claim[]>;
  
  getTask(id: string, tenantId: string): Promise<Task | undefined>;
  getTasks(tenantId: string, filters?: TaskFilters): Promise<Task[]>;
  getTasksWithDetails(tenantId: string, filters?: TaskFilters): Promise<{ tasks: TaskWithDetails[], totalCount: number }>;
  getTaskWithDetails(id: string, tenantId: string): Promise<TaskWithDetails | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, tenantId: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  startTaskTimer(id: string, tenantId: string): Promise<Task | undefined>;
  stopTaskTimer(id: string, tenantId: string): Promise<Task | undefined>;
  
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(claimId: string, tenantId: string): Promise<ActivityLog[]>;
  
  getProductivityMetrics(tenantId: string, userId?: string): Promise<ProductivityMetrics>;
  
  createCsvImport(csvImport: InsertCsvImport): Promise<CsvImport>;
  updateCsvImport(id: string, tenantId: string, updates: Partial<Omit<CsvImport, 'id' | 'createdAt'>>): Promise<CsvImport | undefined>;
  getCsvImport(id: string, tenantId: string): Promise<CsvImport | undefined>;
  getCsvImports(tenantId: string): Promise<CsvImport[]>;
  bulkCreateCsvImportRows(rows: InsertCsvImportRow[]): Promise<void>;
  getCsvImportRows(importId: string, tenantId: string, limit?: number, offset?: number): Promise<CsvImportRow[]>;
  getCsvImportRowCount(importId: string, tenantId: string): Promise<number>;
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
  limit?: number;
  offset?: number;
}

export interface TaskFilters {
  status?: string | string[];
  assignedTo?: string;
  claimId?: string;
  priority?: string;
  client?: string;
  search?: string;
  limit?: number;
  offset?: number;
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

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
        role: 'agent',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          fullName: [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email || 'User',
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const result = await db.insert(tenants).values(tenant).returning();
    return result[0];
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
    
    const result = await db.insert(claims).values(claimsList).returning();
    return result;
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
      conditions.push(eq(tasks.assignedTo, filters.assignedTo));
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
      conditions.push(eq(tasks.assignedTo, filters.assignedTo));
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
}

export const storage = new DbStorage();
