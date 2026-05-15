"use client";

import type { TableProps } from "antd";
import {
  Button,
  Descriptions,
  Form,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
} from "antd";
import { useState } from "react";

import { AdminPageFrame } from "@/app/admin/_components/admin-page-frame";
import { FilterActionButtons } from "@/app/admin/_components/shared/filter-action-buttons";
import { ManagementListContent } from "@/app/admin/_components/shared/management-list-content";
import {
  hasActiveFilterValues,
  matchesTextFilter,
  normalizeDateRangeFilters,
  normalizeOptionalFilterValue,
} from "@/app/admin/_hooks/admin-filters";
import { useDeferredTablePending } from "@/app/admin/_hooks/use-deferred-table-pending";
import { adminClient } from "@/lib/admin/client";
import type {
  ExpenseBudgetSummary,
  ExpenseCategorySummary,
} from "@/lib/expense/types";

const budgetPageSizeOptions = [10, 20, 30, 40, 50];
const filterGridStyle = {
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} as const;

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  style: "currency",
});

type BudgetFilterFormValues = {
  blockedState?: "blocked" | "clean";
  categoryLabel?: string;
  latestClaimDateEnd?: string;
  latestClaimDateStart?: string;
  usageState?: "used" | "unused";
};

type ExpenseBudgetMonitoringPageProps = {
  initialSummary: ExpenseBudgetSummary;
};

function formatCurrency(valueInCents: number) {
  return currencyFormatter.format(valueInCents / 100);
}

export function ExpenseBudgetMonitoringPage({
  initialSummary,
}: ExpenseBudgetMonitoringPageProps) {
  const [filterForm] = Form.useForm<BudgetFilterFormValues>();
  const { isPending: isTablePending, runDeferred } = useDeferredTablePending();
  const [summary, setSummary] = useState(initialSummary);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<BudgetFilterFormValues>(
    {},
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(budgetPageSizeOptions[0]);

  async function refreshSummary(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    setPageError(null);

    try {
      const response = await adminClient.getExpenseBudgetSummary();

      setSummary(response.summary);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "读取预算汇总失败。",
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  function handleApplyFilters(values: BudgetFilterFormValues) {
    const nextFilters = normalizeDateRangeFilters(
      {
        blockedState: values.blockedState || undefined,
        categoryLabel: normalizeOptionalFilterValue(values.categoryLabel),
        latestClaimDateEnd: values.latestClaimDateEnd,
        latestClaimDateStart: values.latestClaimDateStart,
        usageState: values.usageState || undefined,
      },
      "latestClaimDateStart",
      "latestClaimDateEnd",
    );

    if (
      nextFilters.latestClaimDateStart !== values.latestClaimDateStart ||
      nextFilters.latestClaimDateEnd !== values.latestClaimDateEnd
    ) {
      filterForm.setFieldsValue({
        latestClaimDateEnd: nextFilters.latestClaimDateEnd,
        latestClaimDateStart: nextFilters.latestClaimDateStart,
      });
    }

    runDeferred(() => {
      setAppliedFilters(nextFilters);
      setCurrentPage(1);
    });
  }

  function handleResetFilters() {
    filterForm.resetFields();
    runDeferred(() => {
      setAppliedFilters({});
      setCurrentPage(1);
    });
  }

  function handlePaginationChange(nextPage: number, nextPageSize: number) {
    runDeferred(() => {
      setCurrentPage(nextPage);
      setPageSize(nextPageSize);
    });
  }

  const blockedStateOptions = [
    { label: "存在禁报", value: "blocked" },
    { label: "无禁报", value: "clean" },
  ];
  const usageStateOptions = [
    { label: "已有使用", value: "used" },
    { label: "暂无使用", value: "unused" },
  ];

  const filteredCategories = summary.categories.filter((category) => {
    if (
      !matchesTextFilter(category.categoryLabel, appliedFilters.categoryLabel)
    ) {
      return false;
    }

    if (
      appliedFilters.blockedState === "blocked" &&
      category.overBudgetBlockedCount === 0
    ) {
      return false;
    }

    if (
      appliedFilters.blockedState === "clean" &&
      category.overBudgetBlockedCount > 0
    ) {
      return false;
    }

    if (appliedFilters.usageState === "used" && category.usedAmountCents <= 0) {
      return false;
    }

    if (
      appliedFilters.usageState === "unused" &&
      category.usedAmountCents > 0
    ) {
      return false;
    }

    const latestClaimDate = category.latestClaimAt?.slice(0, 10);

    if (
      (appliedFilters.latestClaimDateStart ||
        appliedFilters.latestClaimDateEnd) &&
      !latestClaimDate
    ) {
      return false;
    }

    if (
      appliedFilters.latestClaimDateStart &&
      latestClaimDate &&
      latestClaimDate < appliedFilters.latestClaimDateStart
    ) {
      return false;
    }

    if (
      appliedFilters.latestClaimDateEnd &&
      latestClaimDate &&
      latestClaimDate > appliedFilters.latestClaimDateEnd
    ) {
      return false;
    }

    return true;
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  );
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCategories = filteredCategories.slice(
    (effectiveCurrentPage - 1) * pageSize,
    effectiveCurrentPage * pageSize,
  );

  const columns: TableProps<ExpenseCategorySummary>["columns"] = [
    {
      title: "费用类型",
      dataIndex: "categoryLabel",
      key: "categoryLabel",
    },
    {
      title: "预算总额",
      dataIndex: "budgetAmountCents",
      key: "budgetAmountCents",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "已使用",
      dataIndex: "usedAmountCents",
      key: "usedAmountCents",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "剩余",
      dataIndex: "remainingAmountCents",
      key: "remainingAmountCents",
      render: (value: number) => (
        <span className={value < 0 ? "text-rose-600" : undefined}>
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      title: "超支禁报",
      key: "overBudgetBlocked",
      render: (_, record) => (
        <div>
          <p className="font-medium text-stone-950">
            {formatCurrency(record.overBudgetBlockedAmountCents)}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {record.overBudgetBlockedCount} 笔
          </p>
        </div>
      ),
    },
    {
      title: "记录数",
      dataIndex: "totalClaims",
      key: "totalClaims",
    },
    {
      title: "最近记录",
      dataIndex: "latestClaimAt",
      key: "latestClaimAt",
      render: (value: string | null) => value ?? "--",
    },
  ];

  return (
    <AdminPageFrame
      variant="management-list"
      badges={[]}
      eyebrow=""
      title=""
      summary=""
      operationsTitle=""
      operationsDescription=""
      operations={
        <Form form={filterForm} layout="vertical" onFinish={handleApplyFilters}>
          <div className="grid items-end gap-4 pb-2" style={filterGridStyle}>
            <Form.Item<BudgetFilterFormValues>
              className="!mb-0"
              label="费用类型"
              name="categoryLabel"
            >
              <Input allowClear placeholder="输入费用类型" />
            </Form.Item>

            <Form.Item<BudgetFilterFormValues>
              className="!mb-0"
              label="禁报情况"
              name="blockedState"
            >
              <Select
                allowClear
                placeholder="全部"
                options={blockedStateOptions}
              />
            </Form.Item>

            <Form.Item<BudgetFilterFormValues>
              className="!mb-0"
              label="使用情况"
              name="usageState"
            >
              <Select
                allowClear
                placeholder="全部"
                options={usageStateOptions}
              />
            </Form.Item>

            <Form.Item<BudgetFilterFormValues>
              className="!mb-0"
              label="开始日期"
              name="latestClaimDateStart"
            >
              <Input type="date" />
            </Form.Item>

            <Form.Item<BudgetFilterFormValues>
              className="!mb-0"
              label="结束日期"
              name="latestClaimDateEnd"
            >
              <Input type="date" />
            </Form.Item>

            <FilterActionButtons
              onReset={handleResetFilters}
              extra={
                <Button
                  onClick={() => void refreshSummary()}
                  disabled={isLoading}
                >
                  刷新汇总
                </Button>
              }
            />
          </div>
        </Form>
      }
      contentTitle=""
      contentDescription=""
      contentBadge=""
    >
      <div className="mb-5 rounded-[22px] border border-stone-200/80 bg-stone-50/90 p-4">
        <Descriptions
          size="small"
          column={2}
          items={[
            {
              key: "scopeLabel",
              label: "汇总口径",
              children: (
                <Tag color="geekblue" className="!rounded-full">
                  {summary.scopeLabel}
                </Tag>
              ),
            },
            {
              key: "totalBudgetAmountCents",
              label: "预算总额",
              children: formatCurrency(summary.totalBudgetAmountCents),
            },
            {
              key: "usedAmountCents",
              label: "已使用",
              children: formatCurrency(summary.usedAmountCents),
            },
            {
              key: "remainingAmountCents",
              label: "剩余",
              children: formatCurrency(summary.remainingAmountCents),
            },
            {
              key: "overBudgetBlockedAmountCents",
              label: "超支禁报金额",
              children: formatCurrency(summary.overBudgetBlockedAmountCents),
            },
            {
              key: "overBudgetBlockedCount",
              label: "超支禁报笔数",
              children: `${summary.overBudgetBlockedCount} 笔`,
            },
          ]}
        />
      </div>

      <ManagementListContent
        currentPage={effectiveCurrentPage}
        pageError={pageError}
        pageSize={pageSize}
        pagination={
          <Pagination
            current={effectiveCurrentPage}
            pageSize={pageSize}
            total={filteredCategories.length}
            showSizeChanger
            pageSizeOptions={budgetPageSizeOptions.map(String)}
            onChange={handlePaginationChange}
            onShowSizeChange={handlePaginationChange}
          />
        }
        totalItems={filteredCategories.length}
        totalLabel="个费用类型"
      >
        <Table<ExpenseCategorySummary>
          rowKey="categoryKey"
          columns={columns}
          dataSource={paginatedCategories}
          pagination={false}
          loading={isLoading || isTablePending}
          scroll={{ x: 880 }}
          locale={{
            emptyText: pageError
              ? "当前无法展示预算汇总列表。"
              : hasActiveFilterValues(appliedFilters)
                ? "没有匹配当前筛选条件的费用类型。"
                : "暂无可展示预算数据。",
          }}
        />
      </ManagementListContent>
    </AdminPageFrame>
  );
}
