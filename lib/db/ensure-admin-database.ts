import { eq } from "drizzle-orm";

import { hashAdminPassword } from "@/lib/admin/passwords";
import {
  builtInRoles,
  defaultDevelopmentRootPassword,
  defaultRootAccount,
} from "@/lib/admin/system-data";
import { db, sqlite } from "@/lib/db/client";
import {
  budgetLinesTable,
  expenseCategoriesTable,
  expenseFindingsTable,
  expenseInvoicesTable,
  reimbursementClaimsTable,
  rolesTable,
  usersTable,
} from "@/lib/db/schema";
import {
  baselineBudgetScopeLabel,
  defaultExpenseCategories,
  supportedMockScenarioIds,
} from "@/lib/expense/constants";
import {
  buildExpenseScenarioFindings,
  expenseScenarioDefinitions,
  formatExpenseScenarioSummary,
} from "@/lib/expense/mock-scenarios";

let bootstrapPromise: Promise<void> | null = null;

const seededOrdinaryUserNames = [
  "陈岭",
  "林舟",
  "顾宁",
  "韩松",
  "徐言",
  "沈奕",
  "周乔",
  "赵衡",
  "唐越",
  "魏清",
  "方序",
  "梁澈",
] as const;

const seededOrdinaryUsers = seededOrdinaryUserNames.map(
  (displayName, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    const createdAt = new Date(Date.UTC(2026, 0, 6, 1 + index, 0, 0, 0));

    return {
      id: `seed-user-${sequence}`,
      username: `demo.user${sequence}`,
      displayName,
      createdAt,
    };
  },
);

const seededAdminNames = ["周序", "韩骁", "许棠", "陆征"] as const;

const seededAdminUsers = seededAdminNames.map((displayName, index) => {
  const sequence = String(index + 1).padStart(2, "0");
  const createdAt = new Date(Date.UTC(2026, 0, 4, 10 + index, 30, 0, 0));

  return {
    id: `seed-admin-${sequence}`,
    username: `demo.admin${sequence}`,
    displayName,
    createdAt,
  };
});

const invoiceTitlePrefixes = [
  "华景商务",
  "云桥服务",
  "远行科技",
  "恒拓供应",
  "凌川运营",
  "北辰咨询",
] as const;

const invoiceTitleSuffixes = [
  "有限公司",
  "科技有限公司",
  "供应链有限公司",
  "服务有限公司",
  "企业管理有限公司",
] as const;

const seedTaxRates = [1, 3, 6, 9, 13] as const;
const seededExpenseClaimCount = 48;

function getInitialRootPassword() {
  const configuredPassword = process.env.ADMIN_ROOT_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === "development") {
    return defaultDevelopmentRootPassword;
  }

  throw new Error(
    "ADMIN_ROOT_PASSWORD is required outside development to initialize the protected root account.",
  );
}

function executeSchema() {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS roles (
      key text PRIMARY KEY NOT NULL,
      label text NOT NULL,
      summary text NOT NULL,
      permission_scope text NOT NULL,
      protection_note text NOT NULL,
      is_system integer DEFAULT true NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY NOT NULL,
      username text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      display_name text NOT NULL,
      role_key text NOT NULL,
      status text NOT NULL,
      is_protected integer DEFAULT false NOT NULL,
      last_login_at integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (role_key) REFERENCES roles (key)
        ON UPDATE cascade
        ON DELETE restrict
    );
    CREATE INDEX IF NOT EXISTS users_role_key_idx ON users (role_key);
    CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);

    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at integer NOT NULL,
      created_at integer NOT NULL,
      last_seen_at integer NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE cascade
        ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id text PRIMARY KEY NOT NULL,
      actor_type text NOT NULL,
      actor_user_id text,
      actor_username text NOT NULL,
      actor_display_name text NOT NULL,
      actor_role_key text NOT NULL,
      module text NOT NULL,
      action text NOT NULL,
      target_type text NOT NULL,
      target_id text,
      target_name text,
      summary text NOT NULL,
      request_method text,
      request_path text,
      result text NOT NULL,
      metadata text,
      created_at integer NOT NULL,
      FOREIGN KEY (actor_user_id) REFERENCES users (id)
        ON UPDATE cascade
        ON DELETE set null
    );
    CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
    CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs (actor_user_id);
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at);
    CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON audit_logs (module);
    CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id);

    CREATE TABLE IF NOT EXISTS expense_categories (
      key text PRIMARY KEY NOT NULL,
      label text NOT NULL,
      description text NOT NULL,
      sort_order integer NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
    CREATE INDEX IF NOT EXISTS expense_categories_sort_order_idx ON expense_categories (sort_order);

    CREATE TABLE IF NOT EXISTS reimbursement_claims (
      id text PRIMARY KEY NOT NULL,
      scenario_stem text NOT NULL,
      scenario_key text NOT NULL,
      original_file_name text NOT NULL,
      uploader_user_id text,
      uploader_name text NOT NULL,
      uploader_role_key text NOT NULL,
      upload_mode text NOT NULL,
      applicant_name text NOT NULL,
      category_key text NOT NULL,
      status text NOT NULL,
      processing_step text NOT NULL,
      processing_error_message text,
      review_summary text NOT NULL,
      is_forbidden integer DEFAULT false NOT NULL,
      used_fallback_scenario integer DEFAULT false NOT NULL,
      processed_at integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (category_key) REFERENCES expense_categories (key)
        ON UPDATE cascade
        ON DELETE restrict
    );
    CREATE INDEX IF NOT EXISTS reimbursement_claims_category_key_idx ON reimbursement_claims (category_key);
    CREATE INDEX IF NOT EXISTS reimbursement_claims_created_at_idx ON reimbursement_claims (created_at);
    CREATE INDEX IF NOT EXISTS reimbursement_claims_scenario_key_idx ON reimbursement_claims (scenario_key);
    CREATE INDEX IF NOT EXISTS reimbursement_claims_upload_mode_idx ON reimbursement_claims (upload_mode);
    CREATE INDEX IF NOT EXISTS reimbursement_claims_uploader_user_id_idx ON reimbursement_claims (uploader_user_id);
    CREATE INDEX IF NOT EXISTS reimbursement_claims_status_idx ON reimbursement_claims (status);

    CREATE TABLE IF NOT EXISTS expense_invoices (
      id text PRIMARY KEY NOT NULL,
      claim_id text NOT NULL,
      invoice_title text NOT NULL,
      amount_cents integer NOT NULL,
      tax_amount_cents integer NOT NULL,
      tax_rate integer NOT NULL,
      issue_date text NOT NULL,
      created_at integer NOT NULL,
      FOREIGN KEY (claim_id) REFERENCES reimbursement_claims (id)
        ON UPDATE cascade
        ON DELETE cascade
    );
    CREATE UNIQUE INDEX IF NOT EXISTS expense_invoices_claim_id_idx ON expense_invoices (claim_id);

    CREATE TABLE IF NOT EXISTS expense_findings (
      id text PRIMARY KEY NOT NULL,
      claim_id text NOT NULL,
      finding_kind text NOT NULL,
      title text NOT NULL,
      summary text NOT NULL,
      blocking integer DEFAULT false NOT NULL,
      created_at integer NOT NULL,
      FOREIGN KEY (claim_id) REFERENCES reimbursement_claims (id)
        ON UPDATE cascade
        ON DELETE cascade
    );
    CREATE INDEX IF NOT EXISTS expense_findings_blocking_idx ON expense_findings (blocking);
    CREATE INDEX IF NOT EXISTS expense_findings_claim_id_idx ON expense_findings (claim_id);

    CREATE TABLE IF NOT EXISTS budget_lines (
      id text PRIMARY KEY NOT NULL,
      category_key text NOT NULL,
      scope_label text NOT NULL,
      total_amount_cents integer NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL,
      FOREIGN KEY (category_key) REFERENCES expense_categories (key)
        ON UPDATE cascade
        ON DELETE restrict
    );
    CREATE INDEX IF NOT EXISTS budget_lines_category_key_idx ON budget_lines (category_key);
    CREATE INDEX IF NOT EXISTS budget_lines_scope_label_idx ON budget_lines (scope_label);
  `);
}

async function seedOrdinaryUsers() {
  const ordinaryUserPasswordHash =
    await hashAdminPassword("seeded-user-123456");

  for (const user of seededOrdinaryUsers) {
    db.insert(usersTable)
      .values({
        id: user.id,
        username: user.username,
        passwordHash: ordinaryUserPasswordHash,
        displayName: user.displayName,
        roleKey: "user",
        status: "active",
        isProtected: false,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
      })
      .onConflictDoNothing({
        target: usersTable.username,
      })
      .run();
  }
}

async function seedAdminUsers() {
  const adminUserPasswordHash = await hashAdminPassword("seeded-admin-123456");

  for (const user of seededAdminUsers) {
    db.insert(usersTable)
      .values({
        id: user.id,
        username: user.username,
        passwordHash: adminUserPasswordHash,
        displayName: user.displayName,
        roleKey: "admin",
        status: "active",
        isProtected: false,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
      })
      .onConflictDoNothing({
        target: usersTable.username,
      })
      .run();
  }
}

async function seedBuiltInRolesAndUsers() {
  const now = new Date();

  for (const role of builtInRoles) {
    db.insert(rolesTable)
      .values({
        key: role.key,
        label: role.label,
        summary: role.summary,
        permissionScope: role.permissionScope,
        protectionNote: role.protectionNote,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: rolesTable.key,
        set: {
          label: role.label,
          summary: role.summary,
          permissionScope: role.permissionScope,
          protectionNote: role.protectionNote,
          isSystem: true,
          updatedAt: now,
        },
      })
      .run();
  }

  const existingRoot = db
    .select({
      id: usersTable.id,
    })
    .from(usersTable)
    .where(eq(usersTable.username, defaultRootAccount.username))
    .get();

  if (!existingRoot) {
    db.insert(usersTable)
      .values({
        id: defaultRootAccount.id,
        username: defaultRootAccount.username,
        passwordHash: await hashAdminPassword(getInitialRootPassword()),
        displayName: defaultRootAccount.displayName,
        roleKey: defaultRootAccount.roleKey,
        status: defaultRootAccount.status,
        isProtected: defaultRootAccount.isProtected,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } else {
    db.update(usersTable)
      .set({
        displayName: defaultRootAccount.displayName,
        roleKey: defaultRootAccount.roleKey,
        status: defaultRootAccount.status,
        isProtected: defaultRootAccount.isProtected,
        updatedAt: now,
      })
      .where(eq(usersTable.id, existingRoot.id))
      .run();
  }

  await seedAdminUsers();
  await seedOrdinaryUsers();
}

function seedExpenseReferenceData() {
  const now = new Date();

  for (const category of defaultExpenseCategories) {
    db.insert(expenseCategoriesTable)
      .values({
        key: category.key,
        label: category.label,
        description: category.description,
        sortOrder: category.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: expenseCategoriesTable.key,
        set: {
          label: category.label,
          description: category.description,
          sortOrder: category.sortOrder,
          updatedAt: now,
        },
      })
      .run();

    db.insert(budgetLinesTable)
      .values({
        id: `seed-budget-${category.key}`,
        categoryKey: category.key,
        scopeLabel: baselineBudgetScopeLabel,
        totalAmountCents: category.budgetAmountCents,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: budgetLinesTable.id,
        set: {
          categoryKey: category.key,
          scopeLabel: baselineBudgetScopeLabel,
          totalAmountCents: category.budgetAmountCents,
          updatedAt: now,
        },
      })
      .run();
  }
}

function seedExpenseMockClaims() {
  const users = db
    .select({
      id: usersTable.id,
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
    })
    .from(usersTable)
    .all();
  const categories = db
    .select({
      key: expenseCategoriesTable.key,
      label: expenseCategoriesTable.label,
    })
    .from(expenseCategoriesTable)
    .all();

  if (users.length === 0 || categories.length === 0) {
    return;
  }

  const ordinaryUsers = users.filter((user) => user.roleKey === "user");
  const privilegedUploaders = users.filter((user) => user.roleKey !== "user");

  if (ordinaryUsers.length === 0 || privilegedUploaders.length === 0) {
    return;
  }

  for (let index = 0; index < seededExpenseClaimCount; index += 1) {
    const sequence = String(index + 1).padStart(3, "0");
    const uploadMode = index % 3 === 0 ? "admin" : "user";
    const uploader =
      uploadMode === "admin"
        ? privilegedUploaders[index % privilegedUploaders.length]
        : ordinaryUsers[index % ordinaryUsers.length];
    const applicant =
      uploadMode === "admin"
        ? ordinaryUsers[(index * 5 + 2) % ordinaryUsers.length]
        : uploader;
    const category = categories[(index * 2 + 1) % categories.length];
    const rawScenarioId =
      supportedMockScenarioIds[index % supportedMockScenarioIds.length];
    const usesFallbackScenario = index % 6 === 5;
    const scenarioId = usesFallbackScenario ? "mock-success" : rawScenarioId;
    const scenarioDefinition = expenseScenarioDefinitions[scenarioId];
    const scenarioStem = usesFallbackScenario
      ? `seed-demo-${sequence}`
      : rawScenarioId;
    const createdAt = new Date(
      Date.UTC(
        2026,
        (index % 3) + 1,
        (index % 27) + 1,
        8 + (index % 9),
        (index * 7) % 60,
        0,
        0,
      ),
    );
    const processedAt = new Date(
      createdAt.getTime() + ((index % 5) + 2) * 60 * 1000,
    );
    const issueDate = new Date(
      createdAt.getTime() - ((index % 16) + 3) * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    const amountYuan =
      scenarioId === "mock-overbudget"
        ? 6_900 + ((index * 430) % 8_100)
        : 320 + ((index * 137) % 4_900);
    const amountCents = amountYuan * 100;
    const taxRate = seedTaxRates[index % seedTaxRates.length];
    const taxAmountCents = Math.round(
      (amountCents * taxRate) / (100 + taxRate),
    );
    const invoiceTitle = `${invoiceTitlePrefixes[index % invoiceTitlePrefixes.length]}${invoiceTitleSuffixes[index % invoiceTitleSuffixes.length]}`;
    const claimId = `seed-expense-claim-${sequence}`;
    const invoiceId = `seed-expense-invoice-${sequence}`;
    const findings = buildExpenseScenarioFindings(
      scenarioDefinition,
      scenarioStem,
      usesFallbackScenario,
    );

    sqlite.transaction(() => {
      db.insert(reimbursementClaimsTable)
        .values({
          id: claimId,
          scenarioStem,
          scenarioKey: scenarioId,
          originalFileName: `${scenarioStem}.png`,
          uploaderUserId: uploader.id,
          uploaderName: uploader.displayName,
          uploaderRoleKey: uploader.roleKey,
          uploadMode,
          applicantName: applicant.displayName,
          categoryKey: category.key,
          status: scenarioDefinition.finalStatus,
          processingStep: scenarioDefinition.terminalStep,
          processingErrorMessage: null,
          reviewSummary: formatExpenseScenarioSummary(
            scenarioDefinition,
            scenarioStem,
            usesFallbackScenario,
          ),
          isForbidden: scenarioDefinition.finalStatus === "forbidden",
          usedFallbackScenario: usesFallbackScenario,
          processedAt,
          createdAt,
          updatedAt: processedAt,
        })
        .onConflictDoNothing()
        .run();

      db.insert(expenseInvoicesTable)
        .values({
          id: invoiceId,
          claimId,
          invoiceTitle,
          amountCents,
          taxAmountCents,
          taxRate,
          issueDate,
          createdAt,
        })
        .onConflictDoNothing()
        .run();

      db.insert(expenseFindingsTable)
        .values(
          findings.map((finding, findingIndex) => ({
            id: `seed-expense-finding-${sequence}-${findingIndex + 1}`,
            claimId,
            findingKind: finding.kind,
            title: finding.title,
            summary: finding.summary,
            blocking: finding.blocking,
            createdAt: processedAt,
          })),
        )
        .onConflictDoNothing()
        .run();
    })();
  }
}

export async function ensureAdminDatabase() {
  if (!bootstrapPromise) {
    bootstrapPromise = Promise.resolve()
      .then(executeSchema)
      .then(seedBuiltInRolesAndUsers)
      .then(seedExpenseReferenceData)
      .then(seedExpenseMockClaims)
      .catch((error) => {
        bootstrapPromise = null;
        throw error;
      });
  }

  await bootstrapPromise;
}
