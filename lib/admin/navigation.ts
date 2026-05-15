import { adminRoutes } from "@/lib/admin/routes";
import type { AdminRoleKey } from "@/lib/admin/system-data";

export type AdminIconName =
  | "building"
  | "chart"
  | "clipboard"
  | "database"
  | "fileCheck"
  | "fileSignature"
  | "home"
  | "idCard"
  | "key"
  | "logOut"
  | "receipt"
  | "sparkles"
  | "shield"
  | "tool"
  | "upload"
  | "userCog"
  | "users";

export type AdminSubmenuItem = {
  key: string;
  label: string;
  href: string;
  icon: AdminIconName;
};

export type AdminModule = {
  key: string;
  label: string;
  icon: AdminIconName;
  href: string;
  children?: AdminSubmenuItem[];
};

export { adminRoutes };

export const adminModules: AdminModule[] = [
  {
    key: "expense-control",
    label: "费控一体化",
    icon: "receipt",
    href: adminRoutes.expenseUserUpload,
    children: [
      {
        key: "user-upload",
        label: "普通用户上传",
        href: adminRoutes.expenseUserUpload,
        icon: "upload",
      },
      {
        key: "reimbursements",
        label: "管理员上传",
        href: adminRoutes.expenseReimbursements,
        icon: "fileCheck",
      },
      {
        key: "budgets",
        label: "预算监控",
        href: adminRoutes.expenseBudgets,
        icon: "chart",
      },
    ],
  },
  {
    key: "system-management",
    label: "系统管理",
    icon: "shield",
    href: adminRoutes.systemUsers,
    children: [
      {
        key: "users",
        label: "用户管理",
        href: adminRoutes.systemUsers,
        icon: "userCog",
      },
      {
        key: "roles",
        label: "角色管理",
        href: adminRoutes.systemRoles,
        icon: "shield",
      },
      {
        key: "audit-logs",
        label: "日志审计",
        href: adminRoutes.systemAuditLogs,
        icon: "clipboard",
      },
    ],
  },
];

export const defaultAdminPath = adminRoutes.expenseUserUpload;

export function getDefaultRouteForModule(module: AdminModule) {
  return module.children?.[0]?.href ?? module.href;
}

export function getAdminModulesForRole(roleKey: AdminRoleKey) {
  if (roleKey !== "user") {
    return adminModules;
  }

  return adminModules.map((module) => {
    if (module.key === "expense-control") {
      const visibleChildren = module.children?.filter(
        (item) => item.key === "user-upload",
      );

      return {
        ...module,
        href: visibleChildren?.[0]?.href ?? module.href,
        children: visibleChildren,
      };
    }

    if (module.key === "system-management") {
      const visibleChildren = module.children?.filter(
        (item) => item.key !== "audit-logs",
      );

      return {
        ...module,
        href: visibleChildren?.[0]?.href ?? module.href,
        children: visibleChildren,
      };
    }

    return module;
  });
}

export function getActiveAdminNavigation(
  pathname: string,
  modules: AdminModule[] = adminModules,
) {
  for (const adminModule of modules) {
    const activeChild =
      adminModule.children?.find(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      ) ?? null;

    if (activeChild) {
      return {
        module: adminModule,
        child: activeChild,
      };
    }

    if (
      pathname === adminModule.href ||
      pathname.startsWith(`${adminModule.href}/`)
    ) {
      return {
        module: adminModule,
        child: adminModule.children?.[0] ?? null,
      };
    }
  }

  return {
    module: modules[0],
    child: null,
  };
}
