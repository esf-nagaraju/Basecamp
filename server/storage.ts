import { eq, and, desc, sql, gte, lte, or, like, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Claim,
  type InsertClaim,
  type Task,
  type InsertTask,
  type ActivityLog,
  type InsertActivityLog,
  users,
  tenants,
  claims,
  tasks,
  activityLogs,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  
  getClaim(id: string, tenantId: string): Promise<Claim | undefined>;
  getClaims(tenantId: string, filters?: ClaimFilters): Promise<Claim[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, tenantId: string, updates: Partial<InsertClaim>): Promise<Claim | undefined>;
  bulkCreateClaims(claims: InsertClaim[]): Promise<Claim[]>;
  
  getTask(id: string, tenantId: string): Promise<Task | undefined>;
  getTasks(tenantId: string, filters?: TaskFilters): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, tenantId: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(claimId: string, tenantId: string): Promise<ActivityLog[]>;
  
  getProductivityMetrics(tenantId: string, userId?: string): Promise<ProductivityMetrics>;
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
  status?: string;
  assignedTo?: string;
  claimId?: string;
  priority?: string;
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
      conditions.push(eq(tasks.status, filters.status));
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
}

export const storage = new DbStorage();
