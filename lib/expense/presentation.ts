import type {
  ExpenseClaimOutcomeCategory,
  ExpenseClaimStatus,
  ExpenseProcessingStep,
} from "@/lib/expense/types";

const expenseClaimStatusLabelMap: Record<ExpenseClaimStatus, string> = {
  queued: "排队中",
  processing: "处理中",
  approved: "通过",
  rejected: "已拦截",
  forbidden: "禁止报销",
  failed: "处理失败",
};

const expenseProcessingStepLabelMap: Record<ExpenseProcessingStep, string> = {
  queued: "等待队列",
  ocr: "OCR 识别",
  "invoice-verification": "发票验真",
  "duplicate-check": "重复报销比对",
  "compliance-check": "合规校验",
  "budget-check": "预算校验",
  completed: "处理完成",
};

export function getExpenseClaimStatusLabel(status: ExpenseClaimStatus) {
  return expenseClaimStatusLabelMap[status];
}

export function getExpenseProcessingStepLabel(step: ExpenseProcessingStep) {
  return expenseProcessingStepLabelMap[step];
}

export function isExpenseClaimPending(status: ExpenseClaimStatus) {
  return status === "queued" || status === "processing";
}

export function getExpenseClaimOutcomeCategory(
  status: ExpenseClaimStatus,
): ExpenseClaimOutcomeCategory {
  if (isExpenseClaimPending(status)) {
    return "queue";
  }

  return status === "failed" ? "technical-failure" : "business";
}

export function getExpenseClaimAlertType(status: ExpenseClaimStatus) {
  if (status === "approved") {
    return "success" as const;
  }

  if (status === "failed") {
    return "error" as const;
  }

  return isExpenseClaimPending(status) ? ("info" as const) : ("warning" as const);
}

export function getExpenseClaimStatusTagColor(status: ExpenseClaimStatus) {
  switch (status) {
    case "queued":
      return "default";
    case "processing":
      return "processing";
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "forbidden":
      return "volcano";
    case "failed":
      return "magenta";
  }
}

export function getExpenseProcessingStepTagColor(
  step: ExpenseProcessingStep,
  status?: ExpenseClaimStatus,
) {
  if (status) {
    if (status === "approved") {
      return "success";
    }

    if (status === "rejected") {
      return "error";
    }

    if (status === "forbidden") {
      return "volcano";
    }

    if (status === "failed") {
      return "magenta";
    }
  }

  switch (step) {
    case "queued":
      return "default";
    case "completed":
      return "success";
    default:
      return "processing";
  }
}
