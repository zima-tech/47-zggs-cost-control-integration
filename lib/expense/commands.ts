import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { AdminServiceError } from "@/lib/admin/errors";
import { db, sqlite } from "@/lib/db/client";
import { ensureAdminDatabase } from "@/lib/db/ensure-admin-database";
import {
  expenseInvoicesTable,
  reimbursementClaimsTable,
} from "@/lib/db/schema";
import { getExpenseClaimDetail } from "@/lib/expense/queries";
import {
  bootstrapPendingExpenseQueue,
  enqueueExpenseClaimProcessing,
} from "@/lib/expense/queue";
import {
  assertCanDeleteClaims,
  assertCanUseAdminUpload,
  extractExpenseFileStem,
  generateExpenseInvoicePayload,
  listSeededExpenseCategories,
  resolveApplicantNameForUpload,
  resolveExpenseScenario,
  type ExpenseViewer,
  type UploadExpenseScreenshotInput,
} from "@/lib/expense/shared";

export async function uploadExpenseScreenshot(input: UploadExpenseScreenshotInput) {
  await ensureAdminDatabase();
  await bootstrapPendingExpenseQueue();

  const { file, uploadMode, uploader } = input;

  if (!(file instanceof File)) {
    throw new AdminServiceError("请上传发票截图文件。");
  }

  if (!file.name.trim()) {
    throw new AdminServiceError("上传文件缺少有效文件名。");
  }

  if (uploadMode === "admin") {
    assertCanUseAdminUpload({
      roleKey: uploader.roleKey,
      userId: uploader.userId,
    });
  }

  const scenarioStem = extractExpenseFileStem(file.name);
  const { scenarioId, usedFallbackScenario } = resolveExpenseScenario(scenarioStem);
  const applicantName = await resolveApplicantNameForUpload(
    uploadMode,
    uploader.displayName,
  );
  const categories = await listSeededExpenseCategories();
  const invoicePayload = generateExpenseInvoicePayload(
    categories,
    scenarioId,
    applicantName,
  );
  const claimId = randomUUID();
  const invoiceId = randomUUID();
  const now = new Date();

  sqlite.transaction(() => {
    db.insert(reimbursementClaimsTable)
      .values({
        applicantName: invoicePayload.applicantName,
        categoryKey: invoicePayload.category.key,
        createdAt: now,
        id: claimId,
        isForbidden: false,
        originalFileName: file.name,
        processedAt: null,
        processingErrorMessage: null,
        processingStep: "queued",
        reviewSummary: "已进入后台队列，等待 OCR 识别任务开始处理。",
        scenarioKey: scenarioId,
        scenarioStem,
        status: "queued",
        updatedAt: now,
        uploadMode,
        uploaderName: uploader.displayName,
        uploaderRoleKey: uploader.roleKey,
        uploaderUserId: uploader.userId,
        usedFallbackScenario,
      })
      .run();

    db.insert(expenseInvoicesTable)
      .values({
        amountCents: invoicePayload.amountCents,
        claimId,
        createdAt: now,
        id: invoiceId,
        invoiceTitle: invoicePayload.invoiceTitle,
        issueDate: invoicePayload.issueDate,
        taxAmountCents: invoicePayload.taxAmountCents,
        taxRate: invoicePayload.taxRate,
      })
      .run();
  })();

  enqueueExpenseClaimProcessing({ claimId });

  return getExpenseClaimDetail(claimId, {
    roleKey: uploader.roleKey,
    userId: uploader.userId,
  });
}

export async function deleteExpenseClaim(claimId: string, viewer: ExpenseViewer) {
  await ensureAdminDatabase();

  assertCanDeleteClaims(viewer);

  const claim = db
    .select({
      id: reimbursementClaimsTable.id,
      originalFileName: reimbursementClaimsTable.originalFileName,
    })
    .from(reimbursementClaimsTable)
    .where(eq(reimbursementClaimsTable.id, claimId))
    .get();

  if (!claim) {
    throw new AdminServiceError("未找到指定报销单。", 404);
  }

  db.delete(reimbursementClaimsTable)
    .where(eq(reimbursementClaimsTable.id, claimId))
    .run();

  return {
    deletedClaimId: claim.id,
    deletedOriginalFileName: claim.originalFileName,
  };
}
