import { ExpenseUserUploadPage } from "@/app/admin/_components/expense-user-upload-page";
import { requireAdminSession } from "@/lib/admin/auth";
import { listExpenseClaims } from "@/lib/expense/service";

export default async function AdminExpenseUserUploadPage() {
  const session = await requireAdminSession();

  const initialClaims = await listExpenseClaims({
    scope: "mine",
    viewer: {
      roleKey: session.user.roleKey,
      userId: session.user.id,
    },
  });

  return (
    <ExpenseUserUploadPage
      initialClaims={initialClaims}
      sessionUser={session.user}
    />
  );
}
