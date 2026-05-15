import { adminApiRoutes, authApiRoutes, authRoutes } from "@/lib/admin/routes";
import {
  getAdminErrorPayloadCode,
  getAdminErrorPayloadFieldErrors,
  getAdminErrorPayloadMessage,
} from "@/lib/admin/errors";
import type {
  AdminRole,
  AdminSessionUser,
  AdminUser,
  CreateAdminUserInput,
} from "@/lib/admin/system-data";
import type {
  ExpenseBudgetSummary,
  ExpenseClaimDetail,
  ExpenseClaimListItem,
  ExpenseUploadMode,
} from "@/lib/expense/types";

export class AdminClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly fieldErrors?: Record<string, string>,
    readonly code?: string,
  ) {
    super(message);
    this.name = "AdminClientError";
  }
}

const jsonHeaders = {
  "Content-Type": "application/json",
} as const;

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.assign(authRoutes.login);
  }
}

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
  });
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
      throw new AdminClientError("登录已失效，正在跳转到登录页。", 401);
    }

    throw new AdminClientError(
      getAdminErrorPayloadMessage(data) ?? "请求失败。",
      response.status,
      getAdminErrorPayloadFieldErrors(data),
      getAdminErrorPayloadCode(data),
    );
  }

  return data as T;
}

export type AdminLoginInput = {
  username: string;
  password: string;
};

export const adminClient = {
  login(input: AdminLoginInput) {
    return requestJson<{
      user: AdminSessionUser;
    }>(authApiRoutes.login, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
  },

  logout() {
    return requestJson<{
      success: boolean;
    }>(authApiRoutes.logout, {
      method: "POST",
    });
  },

  listUsers() {
    return requestJson<{
      users: AdminUser[];
    }>(adminApiRoutes.users);
  },

  getUserDetail(userId: string) {
    return requestJson<{
      user: AdminUser;
    }>(adminApiRoutes.userDetail(userId));
  },

  createUser(input: CreateAdminUserInput) {
    return requestJson<{
      user: AdminUser;
    }>(adminApiRoutes.users, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
  },

  deleteUser(userId: string) {
    return requestJson<{
      deletedUserId: string;
      deletedUsername: string;
    }>(adminApiRoutes.userDetail(userId), {
      method: "DELETE",
    });
  },

  listRoles() {
    return requestJson<{
      roles: AdminRole[];
    }>(adminApiRoutes.roles);
  },

  getRoleDetail(roleKey: string) {
    return requestJson<{
      role: AdminRole;
    }>(adminApiRoutes.roleDetail(roleKey));
  },

  listExpenseClaims(scope: "mine" | "all" = "mine") {
    return requestJson<{
      claims: ExpenseClaimListItem[];
    }>(`${adminApiRoutes.expenseReimbursements}?scope=${scope}`);
  },

  getExpenseClaimDetail(claimId: string) {
    return requestJson<{
      claim: ExpenseClaimDetail;
    }>(adminApiRoutes.expenseReimbursementDetail(claimId));
  },

  uploadExpenseScreenshot(file: File, uploadMode: ExpenseUploadMode = "user") {
    const formData = new FormData();

    formData.set("file", file);
    formData.set("uploadMode", uploadMode);

    return requestJson<{
      claim: ExpenseClaimDetail;
    }>(adminApiRoutes.expenseReimbursements, {
      method: "POST",
      body: formData,
    });
  },

  deleteExpenseClaim(claimId: string) {
    return requestJson<{
      deletedClaimId: string;
      deletedOriginalFileName: string;
    }>(adminApiRoutes.expenseReimbursementDetail(claimId), {
      method: "DELETE",
    });
  },

  getExpenseBudgetSummary() {
    return requestJson<{
      summary: ExpenseBudgetSummary;
    }>(adminApiRoutes.expenseBudgetSummary);
  },
};
