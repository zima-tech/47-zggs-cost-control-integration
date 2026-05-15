import type { AdminRoleKey } from "@/lib/admin/system-data";
import type { ExpenseSupportedScenarioId } from "@/lib/expense/constants";

export type ExpenseUploadMode = "user" | "admin";

export type ExpenseProcessingStep =
  | "queued"
  | "ocr"
  | "invoice-verification"
  | "duplicate-check"
  | "compliance-check"
  | "budget-check"
  | "completed";

export type ExpenseClaimStatus =
  | "queued"
  | "processing"
  | "approved"
  | "rejected"
  | "forbidden"
  | "failed";

export type ExpenseClaimOutcomeCategory =
  | "queue"
  | "business"
  | "technical-failure";

export type ExpenseFindingKind =
  | "pass"
  | "trace"
  | "fake"
  | "duplicate"
  | "compliance"
  | "overbudget";

export type ExpenseFinding = {
  id: string;
  kind: ExpenseFindingKind;
  title: string;
  summary: string;
  blocking: boolean;
  createdAt: string;
};

export type ExpenseClaimListItem = {
  id: string;
  scenarioStem: string;
  scenarioKey: ExpenseSupportedScenarioId;
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
  statusLabel: string;
  processingStep: ExpenseProcessingStep;
  processingStepLabel: string;
  outcomeSummary: string;
  outcomeCategory: ExpenseClaimOutcomeCategory;
  usedFallbackScenario: boolean;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
};

export type ExpenseClaimDetail = ExpenseClaimListItem & {
  invoiceTitle: string;
  findings: ExpenseFinding[];
};

export type ExpenseCategorySummary = {
  categoryKey: string;
  categoryLabel: string;
  budgetAmountCents: number;
  latestClaimAt: string | null;
  usedAmountCents: number;
  remainingAmountCents: number;
  overBudgetBlockedAmountCents: number;
  overBudgetBlockedCount: number;
  totalClaims: number;
};

export type ExpenseBudgetSummary = {
  scopeLabel: string;
  totalBudgetAmountCents: number;
  usedAmountCents: number;
  remainingAmountCents: number;
  overBudgetBlockedAmountCents: number;
  overBudgetBlockedCount: number;
  categories: ExpenseCategorySummary[];
};
