export const authRoutes = {
  login: "/login",
} as const;

export const adminRoutes = {
  home: "/admin",
  system: "/admin/system",
  expense: "/admin/expense",
  expenseUserUpload: "/admin/expense/user-upload",
  expenseReimbursements: "/admin/expense/reimbursements",
  expenseBudgets: "/admin/expense/budgets",
  systemUsers: "/admin/system/users",
  systemRoles: "/admin/system/roles",
  systemAuditLogs: "/admin/system/audit-logs",
} as const;

export const authApiRoutes = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  session: "/api/auth/session",
} as const;

export const adminApiRoutes = {
  users: "/api/admin/system/users",
  userDetail: (userId: string) => `/api/admin/system/users/${userId}`,
  roles: "/api/admin/system/roles",
  roleDetail: (roleKey: string) => `/api/admin/system/roles/${roleKey}`,
  expenseReimbursements: "/api/admin/expense/reimbursements",
  expenseReimbursementDetail: (claimId: string) =>
    `/api/admin/expense/reimbursements/${claimId}`,
  expenseBudgetSummary: "/api/admin/expense/budgets/summary",
} as const;
