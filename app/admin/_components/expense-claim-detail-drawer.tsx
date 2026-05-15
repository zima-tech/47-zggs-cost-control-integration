"use client";

import { Alert, Descriptions, Space, Tag } from "antd";

import { DetailDrawerShell } from "@/app/admin/_components/shared/detail-drawer-shell";
import {
  formatExpenseCurrency,
  getExpenseProcessingStepColor,
} from "@/app/admin/_components/expense-ui";
import {
  getExpenseClaimAlertType,
  isExpenseClaimPending,
} from "@/lib/expense/presentation";
import type { ExpenseClaimDetail } from "@/lib/expense/types";

type ExpenseClaimDetailDrawerProps = {
  claim: ExpenseClaimDetail | null;
  loading: boolean;
  open: boolean;
  onClose: () => void;
};

export function ExpenseClaimDetailDrawer({
  claim,
  loading,
  open,
  onClose,
}: ExpenseClaimDetailDrawerProps) {
  return (
    <DetailDrawerShell
      title={claim ? `${claim.originalFileName} 详情` : "报销单详情"}
      loading={loading}
      open={open}
      onClose={onClose}
    >
      {claim ? (
        <div className="space-y-4">
          <Descriptions
            column={1}
            size="small"
            items={[
              {
                key: "originalFileName",
                label: "上传文件",
                children: claim.originalFileName,
              },
              {
                key: "scenario",
                label: "场景 ID",
                children: (
                  <Space wrap size="small">
                    <Tag color="blue" className="!rounded-full">
                      {claim.scenarioStem}
                    </Tag>
                    {claim.usedFallbackScenario ? (
                      <Tag color="gold" className="!rounded-full">
                        默认成功
                      </Tag>
                    ) : null}
                  </Space>
                ),
              },
              {
                key: "uploadMode",
                label: "上传来源",
                children: claim.uploadMode === "admin" ? "管理员上传" : "普通用户上传",
              },
              {
                key: "uploaderName",
                label: "上传人",
                children: (
                  <Space wrap size="small">
                    <span>{claim.uploaderName}</span>
                    <Tag className="!rounded-full" color="geekblue">
                      {claim.uploaderRoleKey}
                    </Tag>
                  </Space>
                ),
              },
              {
                key: "applicantName",
                label: "申请人",
                children: claim.applicantName,
              },
              {
                key: "categoryLabel",
                label: "费用类型",
                children: claim.categoryLabel,
              },
              {
                key: "invoiceTitle",
                label: "发票抬头",
                children: claim.invoiceTitle,
              },
              {
                key: "amount",
                label: "发票金额",
                children: formatExpenseCurrency(claim.amountCents),
              },
              {
                key: "taxAmount",
                label: "税额",
                children: formatExpenseCurrency(claim.taxAmountCents),
              },
              {
                key: "taxRate",
                label: "税率",
                children: `${claim.taxRate}%`,
              },
              {
                key: "issueDate",
                label: "开票日期",
                children: claim.issueDate,
              },
              {
                key: "processingStep",
                label: "处理阶段",
                children: (
                  <Space wrap size="small">
                    <Tag
                      color={getExpenseProcessingStepColor(
                        claim.processingStep,
                        claim.status,
                      )}
                      className="!rounded-full"
                    >
                      {claim.processingStepLabel}
                    </Tag>
                    {claim.processedAt ? <span>{claim.processedAt}</span> : null}
                  </Space>
                ),
              },
              {
                key: "createdAt",
                label: "创建时间",
                children: claim.createdAt,
              },
            ]}
          />

          <Alert
            type={getExpenseClaimAlertType(claim.status)}
            showIcon
            title={claim.statusLabel}
            description={claim.outcomeSummary}
          />

          <section className="rounded-[22px] border border-stone-200/80 bg-stone-50/90 p-4">
            <p className="text-sm font-semibold text-stone-950">审核发现</p>
            <div className="mt-3 space-y-3">
              {claim.findings.length > 0 ? (
                claim.findings.map((finding) => (
                  <article
                    key={finding.id}
                    className="rounded-[16px] bg-white px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-950">{finding.title}</p>
                      <Tag
                        color={finding.blocking ? "error" : "blue"}
                        className="!rounded-full"
                      >
                        {finding.blocking ? "阻断" : "信息"}
                      </Tag>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {finding.summary}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm leading-6 text-stone-500">
                  {isExpenseClaimPending(claim.status)
                    ? "当前报销单还在队列处理中，审核发现会在对应步骤完成后写入。"
                    : "当前报销单暂无审核发现记录。"}
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </DetailDrawerShell>
  );
}
