"use client";

import type { TableProps } from "antd";
import { Button, Popconfirm, Space, Table, Tag } from "antd";

import {
  expenseScenarioLabelMap,
  formatExpenseCurrency,
  getExpenseProcessingStepColor,
  getExpenseStatusTagColor,
} from "@/app/admin/_components/expense-ui";
import type {
  ExpenseClaimListItem,
  ExpenseClaimStatus,
} from "@/lib/expense/types";

type ExpenseClaimTableProps = {
  claims: ExpenseClaimListItem[];
  deletingClaimId?: string | null;
  emptyText: string;
  isLoading: boolean;
  onDeleteClaim?: (claimId: string) => void;
  onOpenDetail: (claimId: string) => void;
  variant: "admin" | "user";
};

export function ExpenseClaimTable({
  claims,
  deletingClaimId = null,
  emptyText,
  isLoading,
  onDeleteClaim,
  onOpenDetail,
  variant,
}: ExpenseClaimTableProps) {
  const columns: TableProps<ExpenseClaimListItem>["columns"] =
    variant === "admin"
      ? [
          {
            title: "报销单",
            dataIndex: "originalFileName",
            key: "originalFileName",
            render: (_, record) => (
              <div>
                <p className="font-semibold text-stone-950">
                  {record.originalFileName}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  申请人 {record.applicantName}
                </p>
              </div>
            ),
          },
          {
            title: "上传人",
            dataIndex: "uploaderName",
            key: "uploaderName",
            render: (_: string, record) => (
              <div>
                <p className="font-medium text-stone-950">{record.uploaderName}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {record.uploaderRoleKey}
                </p>
              </div>
            ),
          },
          {
            title: "场景",
            dataIndex: "scenarioKey",
            key: "scenarioKey",
            render: (value: string, record) => (
              <div className="flex flex-wrap gap-2">
                <Tag className="!rounded-full" color="blue">
                  {expenseScenarioLabelMap[value] ?? value}
                </Tag>
                {record.usedFallbackScenario ? (
                  <Tag className="!rounded-full" color="gold">
                    默认成功
                  </Tag>
                ) : null}
              </div>
            ),
          },
          {
            title: "费用类型",
            dataIndex: "categoryLabel",
            key: "categoryLabel",
          },
          {
            title: "金额",
            dataIndex: "amountCents",
            key: "amountCents",
            render: (value: number, record) => (
              <div>
                <p className="font-semibold text-stone-950">
                  {formatExpenseCurrency(value)}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  税额 {formatExpenseCurrency(record.taxAmountCents)}
                </p>
              </div>
            ),
          },
          {
            title: "处理阶段",
            dataIndex: "processingStepLabel",
            key: "processingStepLabel",
            render: (_: string, record) => (
              <Tag
                color={getExpenseProcessingStepColor(
                  record.processingStep,
                  record.status,
                )}
                className="!rounded-full"
              >
                {record.processingStepLabel}
              </Tag>
            ),
          },
          {
            title: "状态",
            dataIndex: "status",
            key: "status",
            render: (_: ExpenseClaimStatus, record) => (
              <Tag
                color={getExpenseStatusTagColor(record.status)}
                className="!rounded-full"
              >
                {record.statusLabel}
              </Tag>
            ),
          },
          {
            title: "创建时间",
            dataIndex: "createdAt",
            key: "createdAt",
          },
          {
            title: "操作",
            key: "actions",
            render: (_, record) => (
              <Space size="small">
                <Button type="link" onClick={() => onOpenDetail(record.id)}>
                  查看详情
                </Button>
                {onDeleteClaim ? (
                  <Popconfirm
                    title="删除报销单"
                    description="删除后将同时移除发票与审核发现记录。"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => onDeleteClaim(record.id)}
                  >
                    <Button
                      type="link"
                      danger
                      loading={deletingClaimId === record.id}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]
      : [
          {
            title: "发票",
            dataIndex: "originalFileName",
            key: "originalFileName",
            render: (value: string, record) => (
              <div>
                <p className="font-semibold text-stone-950">{value}</p>
                <p className="mt-1 text-sm text-stone-500">{record.categoryLabel}</p>
              </div>
            ),
          },
          {
            title: "场景",
            dataIndex: "scenarioKey",
            key: "scenarioKey",
            render: (value: string, record) => (
              <div className="flex flex-wrap gap-2">
                <Tag className="!rounded-full" color="blue">
                  {expenseScenarioLabelMap[value] ?? value}
                </Tag>
                {record.usedFallbackScenario ? (
                  <Tag className="!rounded-full" color="gold">
                    默认成功
                  </Tag>
                ) : null}
              </div>
            ),
          },
          {
            title: "金额",
            dataIndex: "amountCents",
            key: "amountCents",
            render: (value: number) => formatExpenseCurrency(value),
          },
          {
            title: "处理阶段",
            dataIndex: "processingStepLabel",
            key: "processingStepLabel",
            render: (_: string, record) => (
              <Tag
                color={getExpenseProcessingStepColor(
                  record.processingStep,
                  record.status,
                )}
                className="!rounded-full"
              >
                {record.processingStepLabel}
              </Tag>
            ),
          },
          {
            title: "状态",
            dataIndex: "status",
            key: "status",
            render: (_: ExpenseClaimStatus, record) => (
              <Tag
                color={getExpenseStatusTagColor(record.status)}
                className="!rounded-full"
              >
                {record.statusLabel}
              </Tag>
            ),
          },
          {
            title: "提交时间",
            dataIndex: "createdAt",
            key: "createdAt",
          },
          {
            title: "操作",
            key: "actions",
            render: (_, record) => (
              <Button type="link" onClick={() => onOpenDetail(record.id)}>
                查看详情
              </Button>
            ),
          },
        ];

  return (
    <Table<ExpenseClaimListItem>
      rowKey="id"
      columns={columns}
      dataSource={claims}
      pagination={false}
      loading={isLoading}
      scroll={{ x: variant === "admin" ? 1220 : 980 }}
      locale={{
        emptyText,
      }}
    />
  );
}
