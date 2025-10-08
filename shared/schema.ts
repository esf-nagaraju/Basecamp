import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const USER_ROLES = {
  RCM_SPECIALIST: "rcm_specialist",
  MANAGER: "manager",
  SYSTEM_ADMINISTRATOR: "system_administrator",
  CLIENT_USER: "client_user",
  AUDITOR: "auditor",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  replitId: varchar("replit_id"),
  username: text("username"),
  password: text("password"),
  email: text("email"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default(USER_ROLES.RCM_SPECIALIST),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("users_tenant_idx").on(table.tenantId),
  replitIdIdx: index("users_replit_id_idx").on(table.replitId),
  tenantUsernameUnique: index("users_tenant_username_unique").on(table.tenantId, table.username),
}));

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  
  customerId: text("customer_id"),
  customerName: text("customer_name").notNull(),
  dob: text("dob"),
  insuredId: text("insured_id"),
  
  payorGroup: text("payor_group"),
  payorCode: text("payor_code"),
  payorName: text("payor_name").notNull(),
  payorType: text("payor_type"),
  
  listPrice: decimal("list_price", { precision: 10, scale: 2 }),
  allowedAmount: decimal("allowed_amount", { precision: 10, scale: 2 }),
  dueAmount: decimal("due_amount", { precision: 10, scale: 2 }),
  appliedAmount: decimal("applied_amount", { precision: 10, scale: 2 }),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }).notNull(),
  
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: text("invoice_date"),
  invoiceAge: integer("invoice_age"),
  invoiceAgeBucket: text("invoice_age_bucket"),
  
  dateOfService: text("date_of_service"),
  dosAgeBucket: text("dos_age_bucket"),
  hcpcCode: text("hcpc_code"),
  mod1: text("mod1"),
  mod2: text("mod2"),
  mod3: text("mod3"),
  mod4: text("mod4"),
  
  auditFlag: boolean("audit_flag").default(false),
  pendingAdjustment: boolean("pending_adjustment").default(false),
  errorFlag: boolean("error_flag").default(false),
  invoiceStatus: text("invoice_status"),
  
  status: text("status").notNull().default("new"),
  slaStatus: text("sla_status").default("green"),
  
  denialCodes: jsonb("denial_codes").default([]),
  lastDenialDate: text("last_denial_date"),
  lastDenialPosted: text("last_denial_posted"),
  
  assignedTo: varchar("assigned_to").references(() => users.id),
  priorityScore: integer("priority_score").default(0),
  
  actionCategory: text("action_category"),
  billingProvider: text("billing_provider"),
  dateClaimSent: text("date_claim_sent"),
  errorFile: text("error_file"),
  financialClass: text("financial_class"),
  fixedDenial: text("fixed_denial"),
  fixedRemarkCode: text("fixed_remark_code"),
  followUpDays: integer("follow_up_days"),
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }),
  location: text("location"),
  maxCreateDate: text("max_create_date"),
  nrcContract: text("nrc_contract"),
  payment: decimal("payment", { precision: 10, scale: 2 }),
  payorId: text("payor_id"),
  pfx: text("pfx"),
  renderingProvider: text("rendering_provider"),
  servicingLocation: text("servicing_location"),
  sfx: text("sfx"),
  writeOffs: decimal("write_offs", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("claims_tenant_idx").on(table.tenantId),
  statusIdx: index("claims_status_idx").on(table.status),
  assignedIdx: index("claims_assigned_idx").on(table.assignedTo),
  ageIdx: index("claims_age_idx").on(table.invoiceAge),
  priorityIdx: index("claims_priority_idx").on(table.tenantId, table.priorityScore, table.invoiceAge),
  balanceIdx: index("claims_balance_idx").on(table.tenantId, table.balanceDue),
  invoiceNumIdx: index("claims_invoice_num_idx").on(table.tenantId, table.invoiceNumber),
  payorNameIdx: index("claims_payor_name_idx").on(table.tenantId, table.payorName),
  customerNameIdx: index("claims_customer_name_idx").on(table.tenantId, table.customerName),
}));

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  claimId: varchar("claim_id").notNull().references(() => claims.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  
  resolutionCategory: text("resolution_category"),
  rootCauseCategory: text("root_cause_category"),
  rootCauseDetail: text("root_cause_detail"),
  resolutionAction: text("resolution_action"),
  notes: text("notes"),
  
  progressPercent: integer("progress_percent").default(0),
  totalTimeSeconds: integer("total_time_seconds").default(0),
  activeTimerStartedAt: timestamp("active_timer_started_at"),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("tasks_tenant_idx").on(table.tenantId),
  claimIdx: index("tasks_claim_idx").on(table.claimId),
  assignedIdx: index("tasks_assigned_idx").on(table.assignedTo),
  statusIdx: index("tasks_status_idx").on(table.tenantId, table.status),
  priorityIdx: index("tasks_priority_idx").on(table.tenantId, table.priority),
}));

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  claimId: varchar("claim_id").references(() => claims.id),
  taskId: varchar("task_id").references(() => tasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  note: text("note"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("activity_logs_tenant_idx").on(table.tenantId),
  claimIdx: index("activity_logs_claim_idx").on(table.claimId),
}));

export const csvImports = pgTable("csv_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("processing"),
  
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  errorRows: integer("error_rows").default(0),
  
  columns: jsonb("columns").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  tenantIdx: index("csv_imports_tenant_idx").on(table.tenantId),
  statusIdx: index("csv_imports_status_idx").on(table.status),
}));

export const csvImportRows = pgTable("csv_import_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  importId: varchar("import_id").notNull().references(() => csvImports.id, { onDelete: 'cascade' }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  
  rowNumber: integer("row_number").notNull(),
  data: jsonb("data").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  compositeIdx: index("csv_import_rows_composite_idx").on(table.tenantId, table.importId, table.rowNumber),
}));

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().nullable(),
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCsvImportSchema = createInsertSchema(csvImports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertCsvImportRowSchema = createInsertSchema(csvImportRows).omit({
  id: true,
  createdAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertCsvImport = z.infer<typeof insertCsvImportSchema>;
export type CsvImport = typeof csvImports.$inferSelect;

export type InsertCsvImportRow = z.infer<typeof insertCsvImportRowSchema>;
export type CsvImportRow = typeof csvImportRows.$inferSelect;
