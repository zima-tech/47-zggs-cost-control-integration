import { formatAdminDate } from "@/lib/admin/system-data";
import type { ExpenseSupportedScenarioId } from "@/lib/expense/constants";
import {
  getExpenseClaimOutcomeCategory,
  getExpenseClaimStatusLabel,
  getExpenseProcessingStepLabel,
} from "@/lib/expense/presentation";
import type { ClaimRecord } from "@/lib/expense/shared";
import type {
  ExpenseBudgetSummary,
  ExpenseCategorySummary,
  ExpenseClaimDetail,
  ExpenseClaimListItem,
  ExpenseFinding,
  ExpenseFindingKind,
} from "@/lib/expense/types";

function formatDisplayDate(value: Date | string | null) {
  return value ? formatAdminDate(value) : null;
}

function resolveOutcomeSummary(record: {
  processingErrorMessage: string | null;
  reviewSummary: string;
}) {
  return record.processingErrorMessage ?? record.reviewSummary;
}

export function toExpenseClaimListItem(
  record: Omit<ClaimRecord, "invoiceTitle">,
): ExpenseClaimListItem {
  return {
    amountCents: record.amountCents,
    applicantName: record.applicantName,
    categoryKey: record.categoryKey,
    categoryLabel: record.categoryLabel,
    createdAt: formatDisplayDate(record.createdAt) ?? "",
    id: record.id,
    issueDate: record.issueDate,
    originalFileName: record.originalFileName,
    outcomeCategory: getExpenseClaimOutcomeCategory(record.status),
    outcomeSummary: resolveOutcomeSummary(record),
    processedAt: formatDisplayDate(record.processedAt),
    processingStep: record.processingStep,
    processingStepLabel: getExpenseProcessingStepLabel(record.processingStep),
    scenarioKey: record.scenarioKey as ExpenseSupportedScenarioId,
    scenarioStem: record.scenarioStem,
    status: record.status,
    statusLabel: getExpenseClaimStatusLabel(record.status),
    taxAmountCents: record.taxAmountCents,
    taxRate: record.taxRate,
    updatedAt: formatDisplayDate(record.updatedAt) ?? "",
    uploadMode: record.uploadMode,
    uploaderName: record.uploaderName,
    uploaderRoleKey: record.uploaderRoleKey,
    uploaderUserId: record.uploaderUserId,
    usedFallbackScenario: record.usedFallbackScenario,
  };
}

export function toExpenseFinding(record: {
  id: string;
  findingKind: ExpenseFindingKind;
  title: string;
  summary: string;
  blocking: boolean;
  createdAt: Date;
}): ExpenseFinding {
  return {
    blocking: record.blocking,
    createdAt: formatDisplayDate(record.createdAt) ?? "",
    id: record.id,
    kind: record.findingKind,
    summary: record.summary,
    title: record.title,
  };
}

export function toExpenseClaimDetail(
  record: ClaimRecord,
  findings: ExpenseFinding[],
): ExpenseClaimDetail {
  return {
    ...toExpenseClaimListItem(record),
    findings,
    invoiceTitle: record.invoiceTitle,
  };
}

export function toExpenseBudgetSummary(input: {
  categories: ExpenseCategorySummary[];
  scopeLabel: string;
}): ExpenseBudgetSummary {
  const totalBudgetAmountCents = input.categories.reduce(
    (sum, category) => sum + category.budgetAmountCents,
    0,
  );
  const usedAmountCents = input.categories.reduce(
    (sum, category) => sum + category.usedAmountCents,
    0,
  );
  const overBudgetBlockedAmountCents = input.categories.reduce(
    (sum, category) => sum + category.overBudgetBlockedAmountCents,
    0,
  );
  const overBudgetBlockedCount = input.categories.reduce(
    (sum, category) => sum + category.overBudgetBlockedCount,
    0,
  );

  return {
    categories: input.categories,
    overBudgetBlockedAmountCents,
    overBudgetBlockedCount,
    remainingAmountCents: totalBudgetAmountCents - usedAmountCents,
    scopeLabel: input.scopeLabel,
    totalBudgetAmountCents,
    usedAmountCents,
  };
}
