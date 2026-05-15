"use client";

import type { UploadProps } from "antd";
import { App, Form, Input, Pagination, Select } from "antd";
import { useState } from "react";

import { AdminPageFrame } from "@/app/admin/_components/admin-page-frame";
import { ExpenseClaimDetailDrawer } from "@/app/admin/_components/expense-claim-detail-drawer";
import { ExpenseClaimTable } from "@/app/admin/_components/expense-claim-table";
import {
  expenseScenarioLabelMap,
  fileFromExpenseUploadRequest,
} from "@/app/admin/_components/expense-ui";
import { ExpenseUploadPanel } from "@/app/admin/_components/expense-upload-panel";
import { FilterActionButtons } from "@/app/admin/_components/shared/filter-action-buttons";
import { ManagementListContent } from "@/app/admin/_components/shared/management-list-content";
import {
  hasActiveFilterValues,
  matchesTextFilter,
  normalizeDateRangeFilters,
  normalizeOptionalFilterValue,
} from "@/app/admin/_hooks/admin-filters";
import { useDeferredTablePending } from "@/app/admin/_hooks/use-deferred-table-pending";
import { useDetailResource } from "@/app/admin/_hooks/use-detail-resource";
import { useExpenseClaimPolling } from "@/app/admin/_hooks/use-expense-claim-polling";
import { adminClient } from "@/lib/admin/client";
import type { AdminSessionUser } from "@/lib/admin/system-data";
import type {
  ExpenseClaimDetail,
  ExpenseClaimListItem,
  ExpenseClaimStatus,
} from "@/lib/expense/types";

const reimbursementPageSizeOptions = [10, 20, 30, 40, 50];
const filterGridStyle = {
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} as const;

type ReimbursementFilterFormValues = {
  applicantName?: string;
  categoryKey?: string;
  createdDateEnd?: string;
  createdDateStart?: string;
  originalFileName?: string;
  outcomeSummary?: string;
  scenarioKey?: string;
  status?: ExpenseClaimStatus;
  uploaderName?: string;
};

type ExpenseAdminUploadPageProps = {
  initialClaims: ExpenseClaimListItem[];
  sessionUser: AdminSessionUser;
};

export function ExpenseAdminUploadPage({
  initialClaims,
  sessionUser,
}: ExpenseAdminUploadPageProps) {
  const { message } = App.useApp();
  const [filterForm] = Form.useForm<ReimbursementFilterFormValues>();
  const { isPending: isTablePending, runDeferred } = useDeferredTablePending();
  const [claims, setClaims] = useState(initialClaims);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<ReimbursementFilterFormValues>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(reimbursementPageSizeOptions[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null);
  const isRootUser = sessionUser.roleKey === "root";
  const {
    closeResource: closeClaimDetail,
    isLoading: isClaimDetailLoading,
    openResource: openClaimDetail,
    refreshResource: refreshSelectedClaim,
    resource: selectedClaim,
    resourceId: selectedClaimId,
  } = useDetailResource(
    async (claimId: string) => {
      const response = await adminClient.getExpenseClaimDetail(claimId);

      return response.claim;
    },
    {
      onOpenError: (error) => {
        message.error(
          error instanceof Error ? error.message : "读取报销单详情失败。",
        );
      },
    },
  );

  async function refreshClaims(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await adminClient.listExpenseClaims("all");

      setClaims(response.claims);
      setPageError(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "读取报销审核队列失败。",
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  async function handleDeleteClaim(claimId: string) {
    setDeletingClaimId(claimId);

    try {
      const response = await adminClient.deleteExpenseClaim(claimId);

      if (selectedClaimId === claimId) {
        closeClaimDetail();
      }

      await refreshClaims();
      message.success(`已删除 ${response.deletedOriginalFileName}。`);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "删除报销单失败。",
      );
    } finally {
      setDeletingClaimId(null);
    }
  }

  useExpenseClaimPolling({
    claims,
    refreshClaims,
    refreshSelectedClaim,
    selectedClaim: selectedClaim as ExpenseClaimDetail | null,
    selectedClaimId,
  });

  function handleApplyFilters(values: ReimbursementFilterFormValues) {
    const nextFilters = normalizeDateRangeFilters(
      {
        applicantName: normalizeOptionalFilterValue(values.applicantName),
        categoryKey: values.categoryKey || undefined,
        createdDateEnd: values.createdDateEnd,
        createdDateStart: values.createdDateStart,
        originalFileName: normalizeOptionalFilterValue(
          values.originalFileName,
        ),
        outcomeSummary: normalizeOptionalFilterValue(values.outcomeSummary),
        scenarioKey: values.scenarioKey || undefined,
        status: values.status || undefined,
        uploaderName: normalizeOptionalFilterValue(values.uploaderName),
      },
      "createdDateStart",
      "createdDateEnd",
    );

    if (
      nextFilters.createdDateStart !== values.createdDateStart ||
      nextFilters.createdDateEnd !== values.createdDateEnd
    ) {
      filterForm.setFieldsValue({
        createdDateEnd: nextFilters.createdDateEnd,
        createdDateStart: nextFilters.createdDateStart,
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

  const uploadProps: UploadProps = {
    accept: "image/*",
    customRequest: async (options) => {
      const file = fileFromExpenseUploadRequest(options.file);

      setIsUploading(true);

      try {
        const response = await adminClient.uploadExpenseScreenshot(
          file,
          "admin",
        );

        await refreshClaims();
        await openClaimDetail(response.claim.id);
        message.success(
          `已上传 ${response.claim.originalFileName}，上传人为 ${sessionUser.displayName}，申请人已按现有用户随机生成。`,
        );
        options.onSuccess?.(response.claim);
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : "上传发票截图失败。",
        );
        options.onError?.(error as Error);
      } finally {
        setIsUploading(false);
      }
    },
    disabled: isUploading,
    multiple: true,
    showUploadList: false,
  };

  const filteredClaims = claims.filter((claim) => {
    if (
      !matchesTextFilter(
        claim.originalFileName,
        appliedFilters.originalFileName,
      )
    ) {
      return false;
    }

    if (!matchesTextFilter(claim.applicantName, appliedFilters.applicantName)) {
      return false;
    }

    if (!matchesTextFilter(claim.uploaderName, appliedFilters.uploaderName)) {
      return false;
    }

    if (
      !matchesTextFilter(claim.outcomeSummary, appliedFilters.outcomeSummary)
    ) {
      return false;
    }

    if (
      appliedFilters.scenarioKey &&
      claim.scenarioKey !== appliedFilters.scenarioKey
    ) {
      return false;
    }

    if (appliedFilters.status && claim.status !== appliedFilters.status) {
      return false;
    }

    if (
      appliedFilters.categoryKey &&
      claim.categoryKey !== appliedFilters.categoryKey
    ) {
      return false;
    }

    const createdDate = claim.createdAt.slice(0, 10);

    if (
      appliedFilters.createdDateStart &&
      createdDate < appliedFilters.createdDateStart
    ) {
      return false;
    }

    if (
      appliedFilters.createdDateEnd &&
      createdDate > appliedFilters.createdDateEnd
    ) {
      return false;
    }

    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const paginatedClaims = filteredClaims.slice(
    (effectiveCurrentPage - 1) * pageSize,
    effectiveCurrentPage * pageSize,
  );

  const scenarioOptions = Array.from(
    new Set(claims.map((claim) => claim.scenarioKey)),
  ).map((value) => ({
    label: expenseScenarioLabelMap[value] ?? value,
    value,
  }));
  const categoryOptions = Array.from(
    new Map(
      claims.map((claim) => [claim.categoryKey, claim.categoryLabel] as const),
    ).entries(),
  ).map(([value, label]) => ({
    label,
    value,
  }));
  const statusOptions = [
    { label: "排队中", value: "queued" },
    { label: "处理中", value: "processing" },
    { label: "通过", value: "approved" },
    { label: "已拦截", value: "rejected" },
    { label: "禁止报销", value: "forbidden" },
    { label: "处理失败", value: "failed" },
  ] satisfies Array<{ label: string; value: ExpenseClaimStatus }>;

  return (
    <>
      <ExpenseUploadPanel
        uppercaseLabel="Admin Upload"
        title="管理员上传"
        summary={
          <>
            当前上传人会记录为 {sessionUser.displayName}（{sessionUser.roleKey}
            ），申请人从系统已有普通用户中随机生成。上传后会进入后台队列。只有
            root 账号在列表中可以删除报销单。
          </>
        }
        alertMessage="管理员上传规则"
        alertDescription="管理员上传会按固定顺序模拟 OCR、发票验真、重复报销、合规和预算校验；遇到对应场景 ID 会在对应步骤给出业务终态，其余文件名会生成随机数据并通过。"
        uploadLabel="拖拽发票截图到这里，或点击直接上传"
        uploadDescription="支持重复上传；上传人固定记录为当前管理员或 root，申请人由系统随机分配。"
        uploadProps={uploadProps}
      />

      <div className="mt-6">
        <AdminPageFrame
          variant="management-list"
          badges={[]}
          eyebrow=""
          title=""
          summary=""
          operationsTitle=""
          operationsDescription=""
          operations={
            <Form
              form={filterForm}
              layout="vertical"
              onFinish={handleApplyFilters}
            >
              <div
                className="grid items-end gap-4 pb-2"
                style={filterGridStyle}
              >
                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="文件名"
                  name="originalFileName"
                >
                  <Input allowClear placeholder="输入文件名" />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="申请人"
                  name="applicantName"
                >
                  <Input allowClear placeholder="输入申请人" />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="上传人"
                  name="uploaderName"
                >
                  <Input allowClear placeholder="输入上传人" />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="场景"
                  name="scenarioKey"
                >
                  <Select
                    allowClear
                    placeholder="全部场景"
                    options={scenarioOptions}
                  />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="状态"
                  name="status"
                >
                  <Select
                    allowClear
                    placeholder="全部状态"
                    options={statusOptions}
                  />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="费用类型"
                  name="categoryKey"
                >
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="全部费用类型"
                    options={categoryOptions}
                  />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="处理摘要"
                  name="outcomeSummary"
                >
                  <Input allowClear placeholder="输入处理摘要" />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="开始日期"
                  name="createdDateStart"
                >
                  <Input type="date" />
                </Form.Item>

                <Form.Item<ReimbursementFilterFormValues>
                  className="!mb-0"
                  label="结束日期"
                  name="createdDateEnd"
                >
                  <Input type="date" />
                </Form.Item>

                <FilterActionButtons onReset={handleResetFilters} />
              </div>
            </Form>
          }
          contentTitle=""
          contentDescription=""
          contentBadge=""
        >
          <ManagementListContent
            currentPage={effectiveCurrentPage}
            pageError={pageError}
            pageSize={pageSize}
            pagination={
              <Pagination
                current={effectiveCurrentPage}
                pageSize={pageSize}
                total={filteredClaims.length}
                showSizeChanger
                pageSizeOptions={reimbursementPageSizeOptions.map(String)}
                onChange={handlePaginationChange}
                onShowSizeChange={handlePaginationChange}
              />
            }
            totalItems={filteredClaims.length}
            totalLabel="条报销单"
          >
            <ExpenseClaimTable
              claims={paginatedClaims}
              deletingClaimId={deletingClaimId}
              emptyText={
                pageError
                  ? "当前无法展示报销审核列表。"
                  : hasActiveFilterValues(appliedFilters)
                    ? "没有匹配当前筛选条件的报销单。"
                    : "暂无可展示报销单。"
              }
              isLoading={isLoading || isTablePending}
              onDeleteClaim={isRootUser ? handleDeleteClaim : undefined}
              onOpenDetail={(claimId) => void openClaimDetail(claimId)}
              variant="admin"
            />
          </ManagementListContent>
        </AdminPageFrame>
      </div>

      <ExpenseClaimDetailDrawer
        claim={selectedClaim}
        loading={isClaimDetailLoading}
        open={Boolean(selectedClaimId)}
        onClose={closeClaimDetail}
      />
    </>
  );
}
