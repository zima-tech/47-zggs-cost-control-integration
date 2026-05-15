import type { UploadProps } from "antd";

import {
  getExpenseClaimStatusTagColor,
  getExpenseProcessingStepTagColor,
  isExpenseClaimPending,
} from "@/lib/expense/presentation";
import type {
  ExpenseClaimStatus,
  ExpenseProcessingStep,
} from "@/lib/expense/types";

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
});

export const expenseScenarioLabelMap: Record<string, string> = {
  "mock-success": "成功通过",
  "mock-fake": "伪造发票",
  "mock-duplicate": "重复报销",
  "mock-compliance": "合规阻断",
  "mock-overbudget": "超支禁报",
};

export function formatExpenseCurrency(valueInCents: number) {
  return currencyFormatter.format(valueInCents / 100);
}

export function getExpenseStatusTagColor(status: ExpenseClaimStatus) {
  return getExpenseClaimStatusTagColor(status);
}

export { isExpenseClaimPending };

export function getExpenseProcessingStepColor(
  step: ExpenseProcessingStep,
  status?: ExpenseClaimStatus,
) {
  return getExpenseProcessingStepTagColor(step, status);
}

export function fileFromExpenseUploadRequest(
  fileLike: Parameters<NonNullable<UploadProps["customRequest"]>>[0]["file"],
) {
  if (fileLike instanceof File) {
    return fileLike;
  }

  const fileName =
    (fileLike as Blob & {
      name?: string;
    }).name ?? "uploaded-invoice.png";

  return new File([fileLike as Blob], fileName, {
    type: (fileLike as Blob).type || "application/octet-stream",
  });
}
