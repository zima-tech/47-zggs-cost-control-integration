import { NextResponse } from "next/server";

import { createAdminAuditActor, recordAuditLog } from "@/lib/admin/audit-log";
import {
  createUnauthorizedAdminResponse,
  getAdminSession,
} from "@/lib/admin/auth";
import { createAdminRouteErrorResponse } from "@/lib/admin/route-responses";
import {
  deleteExpenseClaim,
  getExpenseClaimDetail,
} from "@/lib/expense/service";

export const runtime = "nodejs";

type ReimbursementDetailRouteContext = {
  params: Promise<{
    claimId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: ReimbursementDetailRouteContext,
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return createUnauthorizedAdminResponse();
    }

    const { claimId } = await context.params;
    const claim = await getExpenseClaimDetail(claimId, {
      userId: session.user.id,
      roleKey: session.user.roleKey,
    });

    return NextResponse.json({ claim });
  } catch (error) {
    return createAdminRouteErrorResponse(error, "读取报销单详情失败。");
  }
}

export async function DELETE(
  request: Request,
  context: ReimbursementDetailRouteContext,
) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return createUnauthorizedAdminResponse();
    }

    const { claimId } = await context.params;
    const result = await deleteExpenseClaim(claimId, {
      userId: session.user.id,
      roleKey: session.user.roleKey,
    });

    await recordAuditLog({
      action: "删除报销单",
      actor: createAdminAuditActor(session.user),
      module: "费用管控",
      request,
      summary: `${session.user.displayName} 删除报销单 ${result.deletedOriginalFileName}。`,
      target: {
        id: result.deletedClaimId,
        name: result.deletedOriginalFileName,
        type: "expense_claim",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return createAdminRouteErrorResponse(error, "删除报销单失败。");
  }
}
