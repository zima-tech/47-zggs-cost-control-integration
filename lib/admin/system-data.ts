export type AdminRoleKey = "root" | "admin" | "user";

export type AdminUserStatus = "system" | "active";

export type AdminRole = {
  key: AdminRoleKey;
  label: string;
  summary: string;
  permissionScope: string[];
  protectionNote: string;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
  memberCount?: number;
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  roleKey: AdminRoleKey;
  status: AdminUserStatus;
  statusLabel: string;
  isProtected: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type AdminSessionUser = {
  id: string;
  username: string;
  displayName: string;
  roleKey: AdminRoleKey;
};

export type CreateAdminUserInput = {
  username: string;
  displayName: string;
  password: string;
  roleKey: Exclude<AdminRoleKey, "root">;
};

export const builtInRoles: AdminRole[] = [
  {
    key: "root",
    label: "root",
    summary: "系统保留超级账号，负责平台初始化与最高级别治理。",
    permissionScope: [
      "访问全部后台模块和系统级配置",
      "保留对基础账号与安全策略的最终控制权",
      "在当前阶段不参与普通创建、删除和角色变更流程",
    ],
    protectionNote: "root 是系统保留角色，不支持删除或编辑。",
    isSystem: true,
  },
  {
    key: "admin",
    label: "admin",
    summary: "后台管理员角色，负责日常运营和系统管理操作。",
    permissionScope: [
      "查看并维护费控一体化业务数据与后台基础配置",
      "创建普通后台用户并执行费控审核、预算监控等常规维护操作",
      "不能删除系统保留的 root 账号或修改内置角色体系",
    ],
    protectionNote: "admin 是固定内置角色，本阶段仅展示权限说明。",
    isSystem: true,
  },
  {
    key: "user",
    label: "user",
    summary: "基础协作角色，适合承接普通报销上传账号。",
    permissionScope: [
      "用于承接受限后台访问和普通报销上传权限",
      "可以查看本人上传的报销单处理结果",
      "不具备内置角色治理或系统保留账号管理权限",
    ],
    protectionNote: "user 是固定内置角色，本阶段仅展示权限说明。",
    isSystem: true,
  },
];

export const assignableRoleKeys: Array<Exclude<AdminRoleKey, "root">> = [
  "admin",
  "user",
];

export const defaultRootAccount = {
  id: "root-account",
  username: "root",
  displayName: "系统 Root",
  roleKey: "root",
  status: "system",
  isProtected: true,
} as const;

export const defaultDevelopmentRootPassword = "root123456";

const roleOrder: AdminRoleKey[] = ["root", "admin", "user"];

export function getRoleByKey(roleKey: AdminRoleKey) {
  return builtInRoles.find((role) => role.key === roleKey) ?? builtInRoles[0];
}

export function sortRoleKeys(left: AdminRoleKey, right: AdminRoleKey) {
  return roleOrder.indexOf(left) - roleOrder.indexOf(right);
}

export function isAdminRoleKey(value: string): value is AdminRoleKey {
  return roleOrder.includes(value as AdminRoleKey);
}

export function isAssignableRoleKey(
  value: string,
): value is Exclude<AdminRoleKey, "root"> {
  return assignableRoleKeys.includes(value as Exclude<AdminRoleKey, "root">);
}

export function getAdminRoleColor(roleKey: AdminRoleKey) {
  switch (roleKey) {
    case "root":
      return "volcano";
    case "admin":
      return "cyan";
    case "user":
      return "gold";
  }
}

export function getAdminUserStatusLabel(status: AdminUserStatus) {
  return status === "system" ? "系统内置" : "已创建";
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function formatAdminDate(value: Date | number | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\//g, "-");
}
