import { randomInt, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { ensureAdminDatabase } from "@/lib/db/ensure-admin-database";
import { db, sqlite } from "@/lib/db/client";
import {
  expenseFindingsTable,
  reimbursementClaimsTable,
} from "@/lib/db/schema";
import {
  buildExpenseScenarioFindings,
  expenseScenarioDefinitions,
  formatExpenseScenarioSummary,
} from "@/lib/expense/mock-scenarios";
import { getExpenseProcessingStepLabel } from "@/lib/expense/presentation";
import { readClaimRecord, type FindingSeed, type QueueTask } from "@/lib/expense/shared";
import type { ExpenseClaimStatus, ExpenseProcessingStep } from "@/lib/expense/types";

const queueStepSequence: Array<{
  step: Exclude<ExpenseProcessingStep, "queued" | "completed">;
  summary: string;
}> = [
  {
    step: "ocr",
    summary: "OCR 识别中，正在提取发票抬头、金额、税率与开票日期。",
  },
  {
    step: "invoice-verification",
    summary: "发票验真接口处理中，正在比对票面结构与基础真伪特征。",
  },
  {
    step: "duplicate-check",
    summary: "重复报销比对中，正在检索历史提交记录和同票号线索。",
  },
  {
    step: "compliance-check",
    summary: "合规规则校验中，正在核对费用类型与报销制度限制。",
  },
  {
    step: "budget-check",
    summary: "预算校验中，正在核对类别预算剩余额度与禁报规则。",
  },
];

const queueStepDelayRangeMs = {
  maxExclusive: 3200,
  min: 1600,
} as const;

let expenseQueueChain = Promise.resolve();
let pendingQueueBootstrapPromise: Promise<void> | null = null;

async function delayQueueStep() {
  await new Promise<void>((resolve) => {
    setTimeout(
      resolve,
      randomInt(queueStepDelayRangeMs.min, queueStepDelayRangeMs.maxExclusive),
    );
  });
}

async function setClaimProcessingState(
  claimId: string,
  step: ExpenseProcessingStep,
  summary: string,
) {
  const existingClaim = db
    .select({
      id: reimbursementClaimsTable.id,
    })
    .from(reimbursementClaimsTable)
    .where(eq(reimbursementClaimsTable.id, claimId))
    .get();

  if (!existingClaim) {
    return false;
  }

  db.update(reimbursementClaimsTable)
    .set({
      processingErrorMessage: null,
      processingStep: step,
      reviewSummary: summary,
      status: "processing",
      updatedAt: new Date(),
    })
    .where(eq(reimbursementClaimsTable.id, claimId))
    .run();

  return true;
}

async function completeClaimProcessing(input: {
  claimId: string;
  findings: FindingSeed[];
  status: Extract<ExpenseClaimStatus, "approved" | "rejected" | "forbidden">;
  summary: string;
  terminalStep: ExpenseProcessingStep;
}) {
  const existingClaim = db
    .select({
      id: reimbursementClaimsTable.id,
    })
    .from(reimbursementClaimsTable)
    .where(eq(reimbursementClaimsTable.id, input.claimId))
    .get();

  if (!existingClaim) {
    return false;
  }

  const now = new Date();

  sqlite.transaction(() => {
    db.update(reimbursementClaimsTable)
      .set({
        isForbidden: input.status === "forbidden",
        processedAt: now,
        processingErrorMessage: null,
        processingStep: input.terminalStep,
        reviewSummary: input.summary,
        status: input.status,
        updatedAt: now,
      })
      .where(eq(reimbursementClaimsTable.id, input.claimId))
      .run();

    db.delete(expenseFindingsTable)
      .where(eq(expenseFindingsTable.claimId, input.claimId))
      .run();

    db.insert(expenseFindingsTable)
      .values(
        input.findings.map((finding) => ({
          blocking: finding.blocking,
          claimId: input.claimId,
          createdAt: now,
          findingKind: finding.kind,
          id: randomUUID(),
          summary: finding.summary,
          title: finding.title,
        })),
      )
      .run();
  })();

  return true;
}

async function failClaimProcessing(
  claimId: string,
  step: ExpenseProcessingStep,
  errorMessage: string,
) {
  const existingClaim = db
    .select({
      id: reimbursementClaimsTable.id,
    })
    .from(reimbursementClaimsTable)
    .where(eq(reimbursementClaimsTable.id, claimId))
    .get();

  if (!existingClaim) {
    return;
  }

  const now = new Date();

  sqlite.transaction(() => {
    db.update(reimbursementClaimsTable)
      .set({
        processedAt: now,
        processingErrorMessage: errorMessage,
        processingStep: step,
        reviewSummary: errorMessage,
        status: "failed",
        updatedAt: now,
      })
      .where(eq(reimbursementClaimsTable.id, claimId))
      .run();

    db.insert(expenseFindingsTable)
      .values({
        blocking: true,
        claimId,
        createdAt: now,
        findingKind: "trace",
        id: randomUUID(),
        summary: errorMessage,
        title: "队列处理失败",
      })
      .run();
  })();
}

async function processExpenseClaimTask(task: QueueTask) {
  let activeStep: ExpenseProcessingStep = "queued";

  try {
    const claim = readClaimRecord(task.claimId);

    if (
      !claim ||
      (claim.status !== "queued" && claim.status !== "processing")
    ) {
      return;
    }

    const scenarioDefinition =
      expenseScenarioDefinitions[claim.scenarioKey as keyof typeof expenseScenarioDefinitions];
    const summary = formatExpenseScenarioSummary(
      scenarioDefinition,
      claim.scenarioStem,
      claim.usedFallbackScenario,
    );
    const findings = buildExpenseScenarioFindings(
      scenarioDefinition,
      claim.scenarioStem,
      claim.usedFallbackScenario,
    );

    for (const stepConfig of queueStepSequence) {
      activeStep = stepConfig.step;

      const shouldContinue = await setClaimProcessingState(
        task.claimId,
        stepConfig.step,
        stepConfig.summary,
      );

      if (!shouldContinue) {
        return;
      }

      await delayQueueStep();

      if (scenarioDefinition.terminalStep === stepConfig.step) {
        await completeClaimProcessing({
          claimId: task.claimId,
          findings,
          status: scenarioDefinition.finalStatus,
          summary,
          terminalStep: scenarioDefinition.terminalStep,
        });

        return;
      }
    }

    await completeClaimProcessing({
      claimId: task.claimId,
      findings,
      status: scenarioDefinition.finalStatus,
      summary,
      terminalStep: scenarioDefinition.terminalStep,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `后台队列在${getExpenseProcessingStepLabel(activeStep)}阶段失败：${error.message}`
        : "后台队列处理失败，请稍后重试。";

    await failClaimProcessing(task.claimId, activeStep, message);
  }
}

export function enqueueExpenseClaimProcessing(task: QueueTask) {
  expenseQueueChain = expenseQueueChain
    .then(() => processExpenseClaimTask(task))
    .catch(() => undefined);
}

export async function bootstrapPendingExpenseQueue() {
  await ensureAdminDatabase();

  if (!pendingQueueBootstrapPromise) {
    pendingQueueBootstrapPromise = Promise.resolve().then(() => {
      const pendingClaims = db
        .select({
          id: reimbursementClaimsTable.id,
        })
        .from(reimbursementClaimsTable)
        .where(eq(reimbursementClaimsTable.status, "queued"))
        .orderBy(reimbursementClaimsTable.createdAt)
        .all();
      const processingClaims = db
        .select({
          id: reimbursementClaimsTable.id,
        })
        .from(reimbursementClaimsTable)
        .where(eq(reimbursementClaimsTable.status, "processing"))
        .orderBy(reimbursementClaimsTable.createdAt)
        .all();

      for (const claim of [...processingClaims, ...pendingClaims]) {
        enqueueExpenseClaimProcessing({ claimId: claim.id });
      }
    });
  }

  return pendingQueueBootstrapPromise;
}
