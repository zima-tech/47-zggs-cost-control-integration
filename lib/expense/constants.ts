export const supportedMockScenarioIds = [
  "mock-success",
  "mock-fake",
  "mock-duplicate",
  "mock-compliance",
  "mock-overbudget",
] as const;

export type ExpenseSupportedScenarioId =
  (typeof supportedMockScenarioIds)[number];

export type SeedExpenseCategory = {
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  budgetAmountCents: number;
};

export const baselineBudgetScopeLabel = "FY2026 演示预算";

export const defaultExpenseCategories: SeedExpenseCategory[] = [
  {
    key: "travel-transport",
    label: "差旅交通",
    description: "覆盖机票、火车、打车与跨城交通报销。",
    sortOrder: 1,
    budgetAmountCents: 168_000_00,
  },
  {
    key: "hotel-catering",
    label: "住宿餐饮",
    description: "覆盖差旅住宿、餐补与业务餐叙场景。",
    sortOrder: 2,
    budgetAmountCents: 124_000_00,
  },
  {
    key: "office-supplies",
    label: "办公耗材",
    description: "覆盖办公用品、设备配件与低值耗材采购。",
    sortOrder: 3,
    budgetAmountCents: 86_000_00,
  },
  {
    key: "network-communication",
    label: "通讯网络",
    description: "覆盖电话费、网络资费与远程协作支出。",
    sortOrder: 4,
    budgetAmountCents: 63_000_00,
  },
  {
    key: "marketing",
    label: "市场推广",
    description: "覆盖广告投放、内容推广与渠道活动支出。",
    sortOrder: 5,
    budgetAmountCents: 236_000_00,
  },
  {
    key: "training-services",
    label: "培训服务",
    description: "覆盖培训课程、咨询辅导与外部服务采购。",
    sortOrder: 6,
    budgetAmountCents: 118_000_00,
  },
  {
    key: "events-hospitality",
    label: "招待会务",
    description: "覆盖客户接待、会务组织与商务活动支出。",
    sortOrder: 7,
    budgetAmountCents: 96_000_00,
  },
  {
    key: "logistics-shipping",
    label: "物流运输",
    description: "覆盖寄递、仓配与样品运输相关费用。",
    sortOrder: 8,
    budgetAmountCents: 142_000_00,
  },
];
