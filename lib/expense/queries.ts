import { desc, eq } from "drizzle-orm";

import { AdminServiceError } from "@/lib/admin/errors";
import { formatAdminDate } from "@/lib/admin/system-data";
import { db } from "@/lib/db/client";
import { ensureAdminDatabase } from "@/lib/db/ensure-admin-database";
import {
  budgetLinesTable,
  expenseCategoriesTable,
  expenseFindingsTable,
  expenseInvoicesTable,
  reimbursementClaimsTable,
} from "@/lib/db/schema";
import { baselineBudgetScopeLabel } from "@/lib/expense/constants";
import {
  toExpenseBudgetSummary,
  toExpenseClaimDetail,
  toExpenseClaimListItem,
  toExpenseFinding,
} from "@/lib/expense/mappers";
import { bootstrapPendingExpenseQueue } from "@/lib/expense/queue";
import {
  assertClaimVisibility,
  canViewAllClaims,
  type ExpenseViewer,
  getExpenseClaimBaseSelect,
  type ListExpenseClaimOptions,
  readClaimRecord,
  scopeForViewer,
} from "@/lib/expense/shared";
import type {
  ExpenseBudgetSummary,
  ExpenseCategorySummary,
} from "@/lib/expense/types";

export async function listExpenseClaims(options: ListExpenseClaimOptions = {}) {
  await ensureAdminDatabase();
  await bootstrapPendingExpenseQueue();

  const effectiveScope = scopeForViewer(options);

  if (effectiveScope === "all" && !canViewAllClaims(options.viewer)) {
    throw new AdminServiceError("普通用户不能查看全部报销单。", 403);
  }

  const baseQuery = getExpenseClaimBaseSelect();
  const rows =
    effectiveScope === "mine" && options.viewer
      ? baseQuery
          .where(
            eq(reimbursementClaimsTable.uploaderUserId, options.viewer.userId),
          )
          .orderBy(desc(reimbursementClaimsTable.createdAt))
          .all()
      : baseQuery.orderBy(desc(reimbursementClaimsTable.createdAt)).all();

  return rows.map((row) => toExpenseClaimListItem(row));
}

export async function getExpenseClaimDetail(
  claimId: string,
  viewer?: ExpenseViewer,
) {
  await ensureAdminDatabase();
  await bootstrapPendingExpenseQueue();

  const record = readClaimRecord(claimId);

  if (!record) {
    throw new AdminServiceError("未找到指定报销单。", 404);
  }

  assertClaimVisibility(record, viewer);

  const findings = db
    .select({
      blocking: expenseFindingsTable.blocking,
      createdAt: expenseFindingsTable.createdAt,
      findingKind: expenseFindingsTable.findingKind,
      id: expenseFindingsTable.id,
      summary: expenseFindingsTable.summary,
      title: expenseFindingsTable.title,
    })
    .from(expenseFindingsTable)
    .where(eq(expenseFindingsTable.claimId, claimId))
    .orderBy(
      desc(expenseFindingsTable.blocking),
      desc(expenseFindingsTable.createdAt),
    )
    .all()
    .map(toExpenseFinding);

  return toExpenseClaimDetail(record, findings);
}

export async function getExpenseBudgetSummary(): Promise<ExpenseBudgetSummary> {
  await ensureAdminDatabase();
  await bootstrapPendingExpenseQueue();

  const [categories, budgetLines, claimRows] = await Promise.all([
    db
      .select({
        key: expenseCategoriesTable.key,
        label: expenseCategoriesTable.label,
        sortOrder: expenseCategoriesTable.sortOrder,
      })
      .from(expenseCategoriesTable)
      .orderBy(expenseCategoriesTable.sortOrder)
      .all(),
    db
      .select({
        categoryKey: budgetLinesTable.categoryKey,
        scopeLabel: budgetLinesTable.scopeLabel,
        totalAmountCents: budgetLinesTable.totalAmountCents,
      })
      .from(budgetLinesTable)
      .all(),
    db
      .select({
        amountCents: expenseInvoicesTable.amountCents,
        categoryKey: reimbursementClaimsTable.categoryKey,
        createdAt: reimbursementClaimsTable.createdAt,
        status: reimbursementClaimsTable.status,
      })
      .from(reimbursementClaimsTable)
      .innerJoin(
        expenseInvoicesTable,
        eq(expenseInvoicesTable.claimId, reimbursementClaimsTable.id),
      )
      .all(),
  ]);

  const budgetByCategory = new Map<string, number>();
  let scopeLabel = baselineBudgetScopeLabel;

  for (const line of budgetLines) {
    budgetByCategory.set(
      line.categoryKey,
      (budgetByCategory.get(line.categoryKey) ?? 0) + line.totalAmountCents,
    );
    scopeLabel = line.scopeLabel || scopeLabel;
  }

  const usageByCategory = new Map<
    string,
    {
      overBudgetBlockedAmountCents: number;
      overBudgetBlockedCount: number;
      latestClaimAt: Date | null;
      totalClaims: number;
      usedAmountCents: number;
    }
  >();

  for (const row of claimRows) {
    const current = usageByCategory.get(row.categoryKey) ?? {
      overBudgetBlockedAmountCents: 0,
      overBudgetBlockedCount: 0,
      latestClaimAt: null,
      totalClaims: 0,
      usedAmountCents: 0,
    };

    current.totalClaims += 1;
    current.latestClaimAt =
      current.latestClaimAt && current.latestClaimAt > row.createdAt
        ? current.latestClaimAt
        : row.createdAt;

    if (row.status === "approved") {
      current.usedAmountCents += row.amountCents;
    }

    if (row.status === "forbidden") {
      current.overBudgetBlockedAmountCents += row.amountCents;
      current.overBudgetBlockedCount += 1;
    }

    usageByCategory.set(row.categoryKey, current);
  }

  const categorySummaries: ExpenseCategorySummary[] = categories.map(
    (category) => {
      const budgetAmountCents = budgetByCategory.get(category.key) ?? 0;
      const usage = usageByCategory.get(category.key) ?? {
        overBudgetBlockedAmountCents: 0,
        overBudgetBlockedCount: 0,
        latestClaimAt: null,
        totalClaims: 0,
        usedAmountCents: 0,
      };

      return {
        budgetAmountCents,
        categoryKey: category.key,
        categoryLabel: category.label,
        latestClaimAt: formatAdminDate(usage.latestClaimAt),
        overBudgetBlockedAmountCents: usage.overBudgetBlockedAmountCents,
        overBudgetBlockedCount: usage.overBudgetBlockedCount,
        remainingAmountCents: budgetAmountCents - usage.usedAmountCents,
        totalClaims: usage.totalClaims,
        usedAmountCents: usage.usedAmountCents,
      };
    },
  );

  return toExpenseBudgetSummary({
    categories: categorySummaries,
    scopeLabel,
  });
}
