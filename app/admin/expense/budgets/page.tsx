import { ExpenseBudgetMonitoringPage } from "@/app/admin/_components/expense-budget-monitoring-page";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminRoutes } from "@/lib/admin/routes";
import { getExpenseBudgetSummary } from "@/lib/expense/service";
import { redirect } from "next/navigation";

export default async function AdminExpenseBudgetsPage() {
  const session = await requireAdminSession();

  if (session.user.roleKey === "user") {
    redirect(adminRoutes.expenseUserUpload);
  }

  const initialSummary = await getExpenseBudgetSummary();

  return <ExpenseBudgetMonitoringPage initialSummary={initialSummary} />;
}
