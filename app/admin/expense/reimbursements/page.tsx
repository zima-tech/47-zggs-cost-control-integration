import { ExpenseAdminUploadPage } from "@/app/admin/_components/expense-admin-upload-page";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminRoutes } from "@/lib/admin/routes";
import { listExpenseClaims } from "@/lib/expense/service";
import { redirect } from "next/navigation";

export default async function AdminExpenseReimbursementsPage() {
  const session = await requireAdminSession();

  if (session.user.roleKey === "user") {
    redirect(adminRoutes.expenseUserUpload);
  }

  const initialClaims = await listExpenseClaims({
    scope: "all",
    viewer: {
      roleKey: session.user.roleKey,
      userId: session.user.id,
    },
  });

  return (
    <ExpenseAdminUploadPage
      initialClaims={initialClaims}
      sessionUser={session.user}
    />
  );
}
