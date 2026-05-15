import { NextResponse } from "next/server";

import { createAdminAuditActor, recordAuditLog } from "@/lib/admin/audit-log";
import {
  createUnauthorizedAdminResponse,
  getAdminSession,
} from "@/lib/admin/auth";
import {
  createAdminErrorResponse,
  createAdminRouteErrorResponse,
} from "@/lib/admin/route-responses";
import {
  listExpenseClaims,
  uploadExpenseScreenshot,
} from "@/lib/expense/service";
import type { ExpenseUploadMode } from "@/lib/expense/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return createUnauthorizedAdminResponse();
    }

    const scope = new URL(request.url).searchParams.get("scope");
    const claims = await listExpenseClaims({
      scope: scope === "all" ? "all" : "mine",
      viewer: {
        userId: session.user.id,
        roleKey: session.user.roleKey,
      },
    });

    return NextResponse.json({ claims });
  } catch (error) {
    return createAdminRouteErrorResponse(error, "读取报销审核队列失败。");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return createUnauthorizedAdminResponse();
    }

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    const uploadModeValue = formData?.get("uploadMode");
    const uploadMode: ExpenseUploadMode =
      uploadModeValue === "admin" ? "admin" : "user";

    if (!(file instanceof File)) {
      return createAdminErrorResponse("请上传发票截图文件。");
    }

    const claim = await uploadExpenseScreenshot({
      file,
      uploadMode,
      uploader: {
        userId: session.user.id,
        displayName: session.user.displayName,
        roleKey: session.user.roleKey,
      },
    });

    await recordAuditLog({
      action: "上传发票",
      actor: createAdminAuditActor(session.user),
      metadata: {
        uploadMode,
      },
      module: "费用管控",
      request,
      summary: `${session.user.displayName} 上传发票 ${claim.originalFileName}。`,
      target: {
        id: claim.id,
        name: claim.originalFileName,
        type: "expense_claim",
      },
    });

    return NextResponse.json(
      {
        claim,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createAdminRouteErrorResponse(error, "上传发票截图失败。");
  }
}
