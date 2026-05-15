import { randomInt } from "node:crypto";

import { eq } from "drizzle-orm";

import { AdminServiceError } from "@/lib/admin/errors";
import type { AdminRoleKey } from "@/lib/admin/system-data";
import type { ExpenseSupportedScenarioId } from "@/lib/expense/constants";
import { expenseScenarioDefinitions } from "@/lib/expense/mock-scenarios";
import type {
  ExpenseClaimStatus,
  ExpenseFindingKind,
  ExpenseProcessingStep,
  ExpenseUploadMode,
} from "@/lib/expense/types";
import { db } from "@/lib/db/client";
import { ensureAdminDatabase } from "@/lib/db/ensure-admin-database";
import {
  expenseCategoriesTable,
  expenseInvoicesTable,
  reimbursementClaimsTable,
  usersTable,
} from "@/lib/db/schema";

type CategoryRecord = {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
};

export type FindingSeed = {
  kind: ExpenseFindingKind;
  title: string;
  summary: string;
  blocking: boolean;
};

export type ExpenseViewer = {
  userId: string;
  roleKey: AdminRoleKey;
};

export type UploadExpenseScreenshotInput = {
  file: File;
  uploadMode: ExpenseUploadMode;
  uploader: {
    userId: string;
    displayName: string;
    roleKey: AdminRoleKey;
  };
};

export type ListExpenseClaimOptions = {
  scope?: "mine" | "all";
  viewer?: ExpenseViewer;
};

export type QueueTask = {
  claimId: string;
};

export type ClaimRecord = {
  id: string;
  scenarioStem: string;
  scenarioKey: string;
  originalFileName: string;
  uploaderUserId: string | null;
  uploaderName: string;
  uploaderRoleKey: AdminRoleKey;
  uploadMode: ExpenseUploadMode;
  applicantName: string;
  categoryKey: string;
  categoryLabel: string;
  amountCents: number;
  taxAmountCents: number;
  taxRate: number;
  issueDate: string;
  status: ExpenseClaimStatus;
  processingStep: ExpenseProcessingStep;
  processingErrorMessage: string | null;
  reviewSummary: string;
  isForbidden: boolean;
  usedFallbackScenario: boolean;
  createdAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  invoiceTitle: string;
};

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

function pickRandomValue<T>(values: readonly T[]) {
  return values[randomInt(0, values.length)];
}

export function extractExpenseFileStem(fileName: string) {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "unnamed-upload";
  }

  const dotIndex = trimmed.lastIndexOf(".");

  if (dotIndex <= 0) {
    return trimmed;
  }

  return trimmed.slice(0, dotIndex);
}

export function resolveExpenseScenario(stem: string) {
  const normalizedStem = stem.trim().toLowerCase();

  if (
    Object.prototype.hasOwnProperty.call(
      expenseScenarioDefinitions,
      normalizedStem,
    )
  ) {
    return {
      scenarioId: normalizedStem as ExpenseSupportedScenarioId,
      usedFallbackScenario: false,
    };
  }

  return {
    scenarioId: "mock-success" as const,
    usedFallbackScenario: true,
  };
}

export async function listSeededExpenseCategories() {
  await ensureAdminDatabase();

  const categories = db
    .select({
      key: expenseCategoriesTable.key,
      label: expenseCategoriesTable.label,
      description: expenseCategoriesTable.description,
      sortOrder: expenseCategoriesTable.sortOrder,
    })
    .from(expenseCategoriesTable)
    .orderBy(expenseCategoriesTable.sortOrder)
    .all();

  if (categories.length === 0) {
    throw new AdminServiceError("费用类别基础数据不存在。", 500);
  }

  return categories satisfies CategoryRecord[];
}

async function listRandomApplicantCandidates() {
  await ensureAdminDatabase();

  const users = db
    .select({
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
    })
    .from(usersTable)
    .all()
    .filter((user) => user.roleKey === "user");

  return users.map((user) => user.displayName);
}

export async function resolveApplicantNameForUpload(
  uploadMode: ExpenseUploadMode,
  uploaderDisplayName: string,
) {
  if (uploadMode === "user") {
    return uploaderDisplayName.trim() || "当前用户";
  }

  const candidates = await listRandomApplicantCandidates();

  if (candidates.length === 0) {
    return uploaderDisplayName.trim() || "当前用户";
  }

  return pickRandomValue(candidates);
}

export function generateExpenseInvoicePayload(
  categories: CategoryRecord[],
  scenarioId: ExpenseSupportedScenarioId,
  applicantName: string,
) {
  const category = pickRandomValue(categories);
  const invoiceTitle = `${pickRandomValue(invoiceTitlePrefixes)}${pickRandomValue(
    invoiceTitleSuffixes,
  )}`;
  const taxRate = pickRandomValue([1, 3, 6, 9, 13] as const);
  const issueDate = new Date(
    Date.now() - randomInt(2, 95) * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const amountYuan =
    scenarioId === "mock-overbudget"
      ? randomInt(6_800, 18_001)
      : randomInt(260, 5_801);
  const amountCents = amountYuan * 100;
  const taxAmountCents = Math.round((amountCents * taxRate) / (100 + taxRate));

  return {
    applicantName,
    amountCents,
    category,
    invoiceTitle,
    issueDate,
    taxAmountCents,
    taxRate,
  };
}

export function canViewAllClaims(viewer?: ExpenseViewer) {
  return viewer ? viewer.roleKey !== "user" : false;
}

export function assertCanUseAdminUpload(viewer: ExpenseViewer) {
  if (viewer.roleKey === "user") {
    throw new AdminServiceError("普通用户不能使用管理员上传入口。", 403);
  }
}

export function assertCanDeleteClaims(viewer: ExpenseViewer) {
  if (viewer.roleKey !== "root") {
    throw new AdminServiceError("只有 root 账号可以删除报销单。", 403);
  }
}

export function scopeForViewer(options: ListExpenseClaimOptions) {
  if (options.scope) {
    return options.scope;
  }

  return canViewAllClaims(options.viewer) ? "all" : "mine";
}

export function readClaimRecord(claimId: string) {
  return db
    .select({
      id: reimbursementClaimsTable.id,
      scenarioStem: reimbursementClaimsTable.scenarioStem,
      scenarioKey: reimbursementClaimsTable.scenarioKey,
      originalFileName: reimbursementClaimsTable.originalFileName,
      uploaderUserId: reimbursementClaimsTable.uploaderUserId,
      uploaderName: reimbursementClaimsTable.uploaderName,
      uploaderRoleKey: reimbursementClaimsTable.uploaderRoleKey,
      uploadMode: reimbursementClaimsTable.uploadMode,
      applicantName: reimbursementClaimsTable.applicantName,
      categoryKey: reimbursementClaimsTable.categoryKey,
      categoryLabel: expenseCategoriesTable.label,
      amountCents: expenseInvoicesTable.amountCents,
      taxAmountCents: expenseInvoicesTable.taxAmountCents,
      taxRate: expenseInvoicesTable.taxRate,
      issueDate: expenseInvoicesTable.issueDate,
      invoiceTitle: expenseInvoicesTable.invoiceTitle,
      status: reimbursementClaimsTable.status,
      processingStep: reimbursementClaimsTable.processingStep,
      processingErrorMessage: reimbursementClaimsTable.processingErrorMessage,
      reviewSummary: reimbursementClaimsTable.reviewSummary,
      isForbidden: reimbursementClaimsTable.isForbidden,
      usedFallbackScenario: reimbursementClaimsTable.usedFallbackScenario,
      createdAt: reimbursementClaimsTable.createdAt,
      updatedAt: reimbursementClaimsTable.updatedAt,
      processedAt: reimbursementClaimsTable.processedAt,
    })
    .from(reimbursementClaimsTable)
    .innerJoin(
      expenseInvoicesTable,
      eq(expenseInvoicesTable.claimId, reimbursementClaimsTable.id),
    )
    .innerJoin(
      expenseCategoriesTable,
      eq(expenseCategoriesTable.key, reimbursementClaimsTable.categoryKey),
    )
    .where(eq(reimbursementClaimsTable.id, claimId))
    .get();
}

export function assertClaimVisibility(record: ClaimRecord, viewer?: ExpenseViewer) {
  if (!viewer || canViewAllClaims(viewer)) {
    return;
  }

  if (!record.uploaderUserId || record.uploaderUserId !== viewer.userId) {
    throw new AdminServiceError("无权查看该报销单。", 403);
  }
}

export function getExpenseClaimBaseSelect() {
  return db
    .select({
      id: reimbursementClaimsTable.id,
      scenarioStem: reimbursementClaimsTable.scenarioStem,
      scenarioKey: reimbursementClaimsTable.scenarioKey,
      originalFileName: reimbursementClaimsTable.originalFileName,
      uploaderUserId: reimbursementClaimsTable.uploaderUserId,
      uploaderName: reimbursementClaimsTable.uploaderName,
      uploaderRoleKey: reimbursementClaimsTable.uploaderRoleKey,
      uploadMode: reimbursementClaimsTable.uploadMode,
      applicantName: reimbursementClaimsTable.applicantName,
      categoryKey: reimbursementClaimsTable.categoryKey,
      categoryLabel: expenseCategoriesTable.label,
      amountCents: expenseInvoicesTable.amountCents,
      taxAmountCents: expenseInvoicesTable.taxAmountCents,
      taxRate: expenseInvoicesTable.taxRate,
      issueDate: expenseInvoicesTable.issueDate,
      invoiceTitle: expenseInvoicesTable.invoiceTitle,
      status: reimbursementClaimsTable.status,
      processingStep: reimbursementClaimsTable.processingStep,
      processingErrorMessage: reimbursementClaimsTable.processingErrorMessage,
      reviewSummary: reimbursementClaimsTable.reviewSummary,
      isForbidden: reimbursementClaimsTable.isForbidden,
      usedFallbackScenario: reimbursementClaimsTable.usedFallbackScenario,
      createdAt: reimbursementClaimsTable.createdAt,
      updatedAt: reimbursementClaimsTable.updatedAt,
      processedAt: reimbursementClaimsTable.processedAt,
    })
    .from(reimbursementClaimsTable)
    .innerJoin(
      expenseInvoicesTable,
      eq(expenseInvoicesTable.claimId, reimbursementClaimsTable.id),
    )
    .innerJoin(
      expenseCategoriesTable,
      eq(expenseCategoriesTable.key, reimbursementClaimsTable.categoryKey),
    );
}
