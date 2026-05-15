"use client";

import type { UploadProps } from "antd";
import { App, Form, Input, Pagination, Select, Tag } from "antd";
import { useState } from "react";

import { ExpenseClaimDetailDrawer } from "@/app/admin/_components/expense-claim-detail-drawer";
import { ExpenseClaimTable } from "@/app/admin/_components/expense-claim-table";
import {
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
import { supportedMockScenarioIds } from "@/lib/expense/constants";
import type {
  ExpenseClaimDetail,
  ExpenseClaimListItem,
  ExpenseClaimStatus,
} from "@/lib/expense/types";

type ExpenseUserUploadPageProps = {
  initialClaims: ExpenseClaimListItem[];
  sessionUser: AdminSessionUser;
};
type UserExpenseFilterFormValues = {
  applicantName?: string;
  categoryKey?: string;
  createdDateEnd?: string;
  createdDateStart?: string;
  originalFileName?: string;
  outcomeSummary?: string;
  status?: ExpenseClaimStatus;
  uploaderName?: string;
};
const userExpensePageSizeOptions = [10, 20, 30, 40, 50];
const filterGridStyle = {
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} as const;

function claimLabel(fileName: string) {
  return fileName.trim() || "发票截图";
}

export function ExpenseUserUploadPage({
  initialClaims,
  sessionUser,
}: ExpenseUserUploadPageProps) {
  const { message } = App.useApp();
  const [filterForm] = Form.useForm<UserExpenseFilterFormValues>();
  const { isPending: isTablePending, runDeferred } = useDeferredTablePending();
  const [claims, setClaims] = useState(initialClaims);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<UserExpenseFilterFormValues>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(userExpensePageSizeOptions[0]);
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
      const response = await adminClient.listExpenseClaims("mine");

      setClaims(response.claims);
      setPageError(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "读取发票状态列表失败。",
      );
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  useExpenseClaimPolling({
    claims,
    refreshClaims,
    refreshSelectedClaim,
    selectedClaim: selectedClaim as ExpenseClaimDetail | null,
    selectedClaimId,
  });

  const uploadProps: UploadProps = {
    accept: "image/*",
    customRequest: async (options) => {
      const file = fileFromExpenseUploadRequest(options.file);

      setIsUploading(true);

      try {
        const response = await adminClient.uploadExpenseScreenshot(
          file,
          "user",
        );

        await refreshClaims();
        await openClaimDetail(response.claim.id);
        message.success(
          `已提交 ${claimLabel(file.name)}，上传人和申请人均为 ${sessionUser.displayName}。`,
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
  function handleApplyFilters(values: UserExpenseFilterFormValues) {
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
        uppercaseLabel="User Upload"
        title="普通用户上传"
        summary={
          <>
            这里是普通用户自行上传发票的菜单页。上传后会进入后台队列，上传人和申请人默认都使用当前登录用户
            {sessionUser.displayName}，状态列表会自动刷新。
          </>
        }
        alertMessage="上传说明"
        alertDescription="支持固定文件名 ID：mock-success、mock-fake、mock-duplicate、mock-compliance、mock-overbudget。后台会依次模拟 OCR、验真、重复报销、合规和预算校验，每一步延迟几秒。"
        extra={
          <div className="flex flex-wrap gap-2">
            {supportedMockScenarioIds.map((scenarioId) => (
              <Tag key={scenarioId} className="!rounded-full">
                {scenarioId}
              </Tag>
            ))}
          </div>
        }
        uploadLabel="拖拽发票截图到这里，或点击继续上传"
        uploadDescription="支持连续上传多张发票；每张发票会先进入排队，再逐步变更为处理中和最终状态。"
        uploadProps={uploadProps}
      />

      <section className="admin-panel mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="admin-panel-kicker">My Invoice Status</p>
            <h2 className="admin-panel-title">我的发票状态列表</h2>
            <p className="admin-panel-description">
              这里只展示当前登录用户 {sessionUser.displayName}
              自己上传的发票，不提供删除操作。
            </p>
          </div>

          <Tag color="geekblue" className="!rounded-full">
            {filteredClaims.length} 条
          </Tag>
        </div>

        <div className="mt-5">
          <Form
            form={filterForm}
            layout="vertical"
            onFinish={handleApplyFilters}
          >
            <div className="grid items-end gap-4 pb-2" style={filterGridStyle}>
              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="文件名"
                name="originalFileName"
              >
                <Input allowClear placeholder="输入文件名" />
              </Form.Item>

              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="申请人"
                name="applicantName"
              >
                <Input allowClear placeholder="输入申请人" />
              </Form.Item>

              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="上传人"
                name="uploaderName"
              >
                <Input allowClear placeholder="输入上传人" />
              </Form.Item>

              <Form.Item<UserExpenseFilterFormValues>
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

              <Form.Item<UserExpenseFilterFormValues>
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

              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="处理摘要"
                name="outcomeSummary"
              >
                <Input allowClear placeholder="输入处理摘要" />
              </Form.Item>

              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="开始日期"
                name="createdDateStart"
              >
                <Input type="date" />
              </Form.Item>

              <Form.Item<UserExpenseFilterFormValues>
                className="!mb-0"
                label="结束日期"
                name="createdDateEnd"
              >
                <Input type="date" />
              </Form.Item>

              <FilterActionButtons onReset={handleResetFilters} />
            </div>
          </Form>

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
                pageSizeOptions={userExpensePageSizeOptions.map(String)}
                onChange={handlePaginationChange}
                onShowSizeChange={handlePaginationChange}
              />
            }
            totalItems={filteredClaims.length}
            totalLabel="张发票"
          >
            <ExpenseClaimTable
              claims={paginatedClaims}
              emptyText={
                pageError
                  ? "当前无法展示发票状态列表。"
                  : hasActiveFilterValues(appliedFilters)
                    ? "没有匹配当前筛选条件的发票。"
                    : "当前用户还没有上传记录。"
              }
              isLoading={isLoading || isTablePending}
              onOpenDetail={(claimId) => void openClaimDetail(claimId)}
              variant="user"
            />
          </ManagementListContent>
        </div>
      </section>

      <ExpenseClaimDetailDrawer
        claim={selectedClaim}
        loading={isClaimDetailLoading}
        open={Boolean(selectedClaimId)}
        onClose={closeClaimDetail}
      />
    </>
  );
}
