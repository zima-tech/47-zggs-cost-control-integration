import type { ExpenseSupportedScenarioId } from "@/lib/expense/constants";
import type {
  ExpenseClaimStatus,
  ExpenseFindingKind,
  ExpenseProcessingStep,
} from "@/lib/expense/types";

type FindingSeed = {
  kind: ExpenseFindingKind;
  title: string;
  summary: string;
  blocking: boolean;
};

export type ExpenseScenarioDefinition = {
  id: ExpenseSupportedScenarioId;
  label: string;
  terminalStep: ExpenseProcessingStep;
  finalStatus: Extract<
    ExpenseClaimStatus,
    "approved" | "rejected" | "forbidden"
  >;
  claimSummary: string;
  findings: FindingSeed[];
};

export const expenseScenarioDefinitions: Record<
  ExpenseSupportedScenarioId,
  ExpenseScenarioDefinition
> = {
  "mock-success": {
    id: "mock-success",
    label: "审核通过",
    terminalStep: "completed",
    finalStatus: "approved",
    claimSummary: "未命中风险规则，报销可继续处理。",
    findings: [
      {
        kind: "pass",
        title: "审核通过",
        summary: "当前报销单未触发阻断规则，可进入后续报销流程。",
        blocking: false,
      },
    ],
  },
  "mock-fake": {
    id: "mock-fake",
    label: "伪造发票",
    terminalStep: "invoice-verification",
    finalStatus: "rejected",
    claimSummary: "命中伪造发票场景，当前报销单已被阻断。",
    findings: [
      {
        kind: "fake",
        title: "疑似伪造发票",
        summary: "文件名 ID 触发伪造发票 mock 场景，系统阻断当前报销。",
        blocking: true,
      },
      {
        kind: "trace",
        title: "Mock 规则记录",
        summary: "本条审核结果由固定文件名 ID 生成，便于演示复现。",
        blocking: false,
      },
    ],
  },
  "mock-duplicate": {
    id: "mock-duplicate",
    label: "重复报销",
    terminalStep: "duplicate-check",
    finalStatus: "rejected",
    claimSummary: "命中重复报销场景，当前报销单已被阻断。",
    findings: [
      {
        kind: "duplicate",
        title: "重复报销风险",
        summary: "系统按文件名 ID 命中重复报销 mock 规则，当前报销不可继续。",
        blocking: true,
      },
      {
        kind: "trace",
        title: "Mock 规则记录",
        summary: "重复报销结论由固定文件名 ID 生成，可用于稳定演示。",
        blocking: false,
      },
    ],
  },
  "mock-compliance": {
    id: "mock-compliance",
    label: "合规不通过",
    terminalStep: "compliance-check",
    finalStatus: "rejected",
    claimSummary: "命中合规校验场景，当前报销单已被阻断。",
    findings: [
      {
        kind: "compliance",
        title: "报销规则不合规",
        summary: "文件名 ID 触发合规阻断场景，系统拒绝当前报销。",
        blocking: true,
      },
      {
        kind: "trace",
        title: "Mock 规则记录",
        summary: "合规结论由固定文件名 ID 模拟生成，不依赖真实识别能力。",
        blocking: false,
      },
    ],
  },
  "mock-overbudget": {
    id: "mock-overbudget",
    label: "超支禁报",
    terminalStep: "budget-check",
    finalStatus: "forbidden",
    claimSummary: "命中超支禁报场景，当前报销单被标记为禁止报销。",
    findings: [
      {
        kind: "overbudget",
        title: "预算超支，禁止报销",
        summary: "文件名 ID 触发超支禁报 mock 场景，当前报销不会计入可报销金额。",
        blocking: true,
      },
      {
        kind: "trace",
        title: "Mock 规则记录",
        summary: "该禁报结论用于演示预算监控中的超支拦截效果。",
        blocking: false,
      },
    ],
  },
};

export function formatExpenseScenarioSummary(
  definition: ExpenseScenarioDefinition,
  scenarioStem: string,
  usedFallbackScenario: boolean,
) {
  if (!usedFallbackScenario) {
    return definition.claimSummary;
  }

  return `文件名 ID “${scenarioStem || "unnamed-upload"}”未匹配固定 mock 场景，系统已按普通成功流程生成演示报销结果。`;
}

export function buildExpenseScenarioFindings(
  definition: ExpenseScenarioDefinition,
  scenarioStem: string,
  usedFallbackScenario: boolean,
) {
  if (!usedFallbackScenario) {
    return definition.findings;
  }

  return [
    {
      kind: "pass" as const,
      title: "审核通过",
      summary: `文件名 ID “${scenarioStem || "unnamed-upload"}”未命中固定规则，系统按默认成功场景处理。`,
      blocking: false,
    },
  ];
}
