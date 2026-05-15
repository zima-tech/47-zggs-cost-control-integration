import { NextResponse } from "next/server";

import {
  createUnauthorizedAdminResponse,
  getAdminSession,
} from "@/lib/admin/auth";
import {
  createAdminForbiddenResponse,
  createAdminRouteErrorResponse,
} from "@/lib/admin/route-responses";
import { getExpenseBudgetSummary } from "@/lib/expense/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return createUnauthorizedAdminResponse();
    }

    if (session.user.roleKey === "user") {
      return createAdminForbiddenResponse("普通用户不能查看预算汇总。");
    }

    const summary = await getExpenseBudgetSummary();

    return NextResponse.json({ summary });
  } catch (error) {
    return createAdminRouteErrorResponse(error, "读取预算汇总失败。");
  }
}
