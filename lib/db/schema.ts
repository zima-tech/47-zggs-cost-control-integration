import { relations } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import type { AdminRoleKey, AdminUserStatus } from "@/lib/admin/system-data";
import type {
  ExpenseClaimStatus,
  ExpenseProcessingStep,
  ExpenseUploadMode,
} from "@/lib/expense/types";

export const rolesTable = sqliteTable("roles", {
  key: text("key").$type<AdminRoleKey>().primaryKey(),
  label: text("label").notNull(),
  summary: text("summary").notNull(),
  permissionScope: text("permission_scope", { mode: "json" })
    .$type<string[]>()
    .notNull(),
  protectionNote: text("protection_note").notNull(),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const usersTable = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    roleKey: text("role_key")
      .$type<AdminRoleKey>()
      .notNull()
      .references(() => rolesTable.key, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    status: text("status").$type<AdminUserStatus>().notNull(),
    isProtected: integer("is_protected", { mode: "boolean" })
      .notNull()
      .default(false),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    roleKeyIdx: index("users_role_key_idx").on(table.roleKey),
    usernameIdx: index("users_username_idx").on(table.username),
  }),
);

export const sessionsTable = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
    tokenHashIdx: index("sessions_token_hash_idx").on(table.tokenHash),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  }),
);

export const auditLogsTable = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorType: text("actor_type").$type<"admin" | "system">().notNull(),
    actorUserId: text("actor_user_id").references(() => usersTable.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    actorUsername: text("actor_username").notNull(),
    actorDisplayName: text("actor_display_name").notNull(),
    actorRoleKey: text("actor_role_key").notNull(),
    module: text("module").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    targetName: text("target_name"),
    summary: text("summary").notNull(),
    requestMethod: text("request_method"),
    requestPath: text("request_path"),
    result: text("result").$type<"success" | "failure">().notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<
      string,
      unknown
    > | null>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    actionIdx: index("audit_logs_action_idx").on(table.action),
    actorUserIdIdx: index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    moduleIdx: index("audit_logs_module_idx").on(table.module),
    targetIdx: index("audit_logs_target_idx").on(
      table.targetType,
      table.targetId,
    ),
  }),
);

export const expenseCategoriesTable = sqliteTable(
  "expense_categories",
  {
    key: text("key").primaryKey(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    sortOrderIdx: index("expense_categories_sort_order_idx").on(
      table.sortOrder,
    ),
  }),
);

export const reimbursementClaimsTable = sqliteTable(
  "reimbursement_claims",
  {
    id: text("id").primaryKey(),
    scenarioStem: text("scenario_stem").notNull(),
    scenarioKey: text("scenario_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    uploaderUserId: text("uploader_user_id"),
    uploaderName: text("uploader_name").notNull(),
    uploaderRoleKey: text("uploader_role_key").$type<AdminRoleKey>().notNull(),
    uploadMode: text("upload_mode").$type<ExpenseUploadMode>().notNull(),
    applicantName: text("applicant_name").notNull(),
    categoryKey: text("category_key")
      .notNull()
      .references(() => expenseCategoriesTable.key, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    status: text("status").$type<ExpenseClaimStatus>().notNull(),
    processingStep: text("processing_step")
      .$type<ExpenseProcessingStep>()
      .notNull(),
    processingErrorMessage: text("processing_error_message"),
    reviewSummary: text("review_summary").notNull(),
    isForbidden: integer("is_forbidden", { mode: "boolean" })
      .notNull()
      .default(false),
    usedFallbackScenario: integer("used_fallback_scenario", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    categoryKeyIdx: index("reimbursement_claims_category_key_idx").on(
      table.categoryKey,
    ),
    createdAtIdx: index("reimbursement_claims_created_at_idx").on(
      table.createdAt,
    ),
    scenarioKeyIdx: index("reimbursement_claims_scenario_key_idx").on(
      table.scenarioKey,
    ),
    uploadModeIdx: index("reimbursement_claims_upload_mode_idx").on(
      table.uploadMode,
    ),
    uploaderUserIdIdx: index("reimbursement_claims_uploader_user_id_idx").on(
      table.uploaderUserId,
    ),
    statusIdx: index("reimbursement_claims_status_idx").on(table.status),
  }),
);

export const expenseInvoicesTable = sqliteTable(
  "expense_invoices",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id")
      .notNull()
      .references(() => reimbursementClaimsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    invoiceTitle: text("invoice_title").notNull(),
    amountCents: integer("amount_cents").notNull(),
    taxAmountCents: integer("tax_amount_cents").notNull(),
    taxRate: integer("tax_rate").notNull(),
    issueDate: text("issue_date").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    claimIdIdx: uniqueIndex("expense_invoices_claim_id_idx").on(table.claimId),
  }),
);

export const expenseFindingsTable = sqliteTable(
  "expense_findings",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id")
      .notNull()
      .references(() => reimbursementClaimsTable.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    findingKind: text("finding_kind")
      .$type<
        "pass" | "trace" | "fake" | "duplicate" | "compliance" | "overbudget"
      >()
      .notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    blocking: integer("blocking", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    blockingIdx: index("expense_findings_blocking_idx").on(table.blocking),
    claimIdIdx: index("expense_findings_claim_id_idx").on(table.claimId),
  }),
);

export const budgetLinesTable = sqliteTable(
  "budget_lines",
  {
    id: text("id").primaryKey(),
    categoryKey: text("category_key")
      .notNull()
      .references(() => expenseCategoriesTable.key, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    scopeLabel: text("scope_label").notNull(),
    totalAmountCents: integer("total_amount_cents").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    categoryKeyIdx: index("budget_lines_category_key_idx").on(
      table.categoryKey,
    ),
    scopeLabelIdx: index("budget_lines_scope_label_idx").on(table.scopeLabel),
  }),
);

export const rolesRelations = relations(rolesTable, ({ many }) => ({
  users: many(usersTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  role: one(rolesTable, {
    fields: [usersTable.roleKey],
    references: [rolesTable.key],
  }),
  auditLogs: many(auditLogsTable),
  sessions: many(sessionsTable),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const auditLogsRelations = relations(auditLogsTable, ({ one }) => ({
  actor: one(usersTable, {
    fields: [auditLogsTable.actorUserId],
    references: [usersTable.id],
  }),
}));

export const expenseCategoriesRelations = relations(
  expenseCategoriesTable,
  ({ many }) => ({
    budgetLines: many(budgetLinesTable),
    claims: many(reimbursementClaimsTable),
  }),
);

export const reimbursementClaimsRelations = relations(
  reimbursementClaimsTable,
  ({ many, one }) => ({
    category: one(expenseCategoriesTable, {
      fields: [reimbursementClaimsTable.categoryKey],
      references: [expenseCategoriesTable.key],
    }),
    findings: many(expenseFindingsTable),
    invoice: one(expenseInvoicesTable, {
      fields: [reimbursementClaimsTable.id],
      references: [expenseInvoicesTable.claimId],
    }),
  }),
);

export const expenseInvoicesRelations = relations(
  expenseInvoicesTable,
  ({ one }) => ({
    claim: one(reimbursementClaimsTable, {
      fields: [expenseInvoicesTable.claimId],
      references: [reimbursementClaimsTable.id],
    }),
  }),
);

export const expenseFindingsRelations = relations(
  expenseFindingsTable,
  ({ one }) => ({
    claim: one(reimbursementClaimsTable, {
      fields: [expenseFindingsTable.claimId],
      references: [reimbursementClaimsTable.id],
    }),
  }),
);

export const budgetLinesRelations = relations(budgetLinesTable, ({ one }) => ({
  category: one(expenseCategoriesTable, {
    fields: [budgetLinesTable.categoryKey],
    references: [expenseCategoriesTable.key],
  }),
}));
