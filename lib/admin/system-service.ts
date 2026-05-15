import { count, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { AdminServiceError } from "@/lib/admin/errors";
import { hashAdminPassword } from "@/lib/admin/passwords";
import {
  type AdminRole,
  type AdminUser,
  type CreateAdminUserInput,
  formatAdminDate,
  getAdminUserStatusLabel,
  isAdminRoleKey,
  isAssignableRoleKey,
  normalizeUsername,
  sortRoleKeys,
} from "@/lib/admin/system-data";
import { db } from "@/lib/db/client";
import { ensureAdminDatabase } from "@/lib/db/ensure-admin-database";
import { rolesTable, usersTable } from "@/lib/db/schema";

function toAdminUser(record: {
  id: string;
  username: string;
  displayName: string;
  roleKey: "root" | "admin" | "user";
  status: "system" | "active";
  isProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}): AdminUser {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    roleKey: record.roleKey,
    status: record.status,
    statusLabel: getAdminUserStatusLabel(record.status),
    isProtected: record.isProtected,
    createdAt: formatAdminDate(record.createdAt) ?? "",
    updatedAt: formatAdminDate(record.updatedAt) ?? "",
    lastLoginAt: formatAdminDate(record.lastLoginAt),
  };
}

function toAdminRole(record: {
  key: "root" | "admin" | "user";
  label: string;
  summary: string;
  permissionScope: string[];
  protectionNote: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
}): AdminRole {
  return {
    key: record.key,
    label: record.label,
    summary: record.summary,
    permissionScope: record.permissionScope,
    protectionNote: record.protectionNote,
    isSystem: record.isSystem,
    createdAt: formatAdminDate(record.createdAt) ?? undefined,
    updatedAt: formatAdminDate(record.updatedAt) ?? undefined,
    memberCount: record.memberCount,
  };
}

export async function listAdminUsers() {
  await ensureAdminDatabase();

  const users = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
      status: usersTable.status,
      isProtected: usersTable.isProtected,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.isProtected), desc(usersTable.createdAt))
    .all();

  return users.map(toAdminUser);
}

export async function getAdminUserDetail(userId: string) {
  await ensureAdminDatabase();

  const user = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
      status: usersTable.status,
      isProtected: usersTable.isProtected,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .get();

  if (!user) {
    throw new AdminServiceError("未找到指定用户。", 404);
  }

  return toAdminUser(user);
}

export async function findAdminUserForLogin(username: string) {
  await ensureAdminDatabase();

  return db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      passwordHash: usersTable.passwordHash,
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
    })
    .from(usersTable)
    .where(eq(usersTable.username, normalizeUsername(username)))
    .get();
}

export async function createAdminUser(input: CreateAdminUserInput) {
  await ensureAdminDatabase();

  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim();
  const password = input.password;
  const roleKey = input.roleKey;

  if (!username) {
    throw new AdminServiceError("请输入账号名。");
  }

  if (!displayName) {
    throw new AdminServiceError("请输入显示名称。");
  }

  if (!isAssignableRoleKey(roleKey)) {
    throw new AdminServiceError("只能创建 admin 或 user 角色账号。");
  }

  if (password.length < 8) {
    throw new AdminServiceError("初始密码至少需要 8 位。");
  }

  const existingUser = db
    .select({
      id: usersTable.id,
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .get();

  if (existingUser) {
    throw new AdminServiceError("该账号名已存在。", 409);
  }

  const now = new Date();

  db.insert(usersTable)
    .values({
      id: randomUUID(),
      username,
      passwordHash: await hashAdminPassword(password),
      displayName,
      roleKey,
      status: "active",
      isProtected: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return findAdminUserByUsername(username);
}

async function findAdminUserByUsername(username: string) {
  await ensureAdminDatabase();

  const user = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      roleKey: usersTable.roleKey,
      status: usersTable.status,
      isProtected: usersTable.isProtected,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .get();

  if (!user) {
    throw new AdminServiceError("未找到刚创建的用户。", 500);
  }

  return toAdminUser(user);
}

export async function deleteAdminUser(userId: string) {
  await ensureAdminDatabase();

  const user = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      isProtected: usersTable.isProtected,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .get();

  if (!user) {
    throw new AdminServiceError("未找到指定用户。", 404);
  }

  if (user.isProtected) {
    throw new AdminServiceError("root 账号为系统保留账号，无法删除。", 409);
  }

  db.delete(usersTable).where(eq(usersTable.id, userId)).run();

  return {
    deletedUserId: user.id,
    deletedUsername: user.username,
  };
}

export async function listAdminRoles() {
  await ensureAdminDatabase();

  const roles = db
    .select({
      key: rolesTable.key,
      label: rolesTable.label,
      summary: rolesTable.summary,
      permissionScope: rolesTable.permissionScope,
      protectionNote: rolesTable.protectionNote,
      isSystem: rolesTable.isSystem,
      createdAt: rolesTable.createdAt,
      updatedAt: rolesTable.updatedAt,
      memberCount: count(usersTable.id),
    })
    .from(rolesTable)
    .leftJoin(usersTable, eq(usersTable.roleKey, rolesTable.key))
    .groupBy(
      rolesTable.key,
      rolesTable.label,
      rolesTable.summary,
      rolesTable.permissionScope,
      rolesTable.protectionNote,
      rolesTable.isSystem,
      rolesTable.createdAt,
      rolesTable.updatedAt,
    )
    .all()
    .sort((left, right) => sortRoleKeys(left.key, right.key));

  return roles.map((role) =>
    toAdminRole({
      ...role,
      memberCount: Number(role.memberCount ?? 0),
    }),
  );
}

export async function getAdminRoleDetail(roleKey: string) {
  await ensureAdminDatabase();

  if (!isAdminRoleKey(roleKey)) {
    throw new AdminServiceError("未找到指定角色。", 404);
  }

  const role = db
    .select({
      key: rolesTable.key,
      label: rolesTable.label,
      summary: rolesTable.summary,
      permissionScope: rolesTable.permissionScope,
      protectionNote: rolesTable.protectionNote,
      isSystem: rolesTable.isSystem,
      createdAt: rolesTable.createdAt,
      updatedAt: rolesTable.updatedAt,
      memberCount: count(usersTable.id),
    })
    .from(rolesTable)
    .leftJoin(usersTable, eq(usersTable.roleKey, rolesTable.key))
    .where(eq(rolesTable.key, roleKey))
    .groupBy(
      rolesTable.key,
      rolesTable.label,
      rolesTable.summary,
      rolesTable.permissionScope,
      rolesTable.protectionNote,
      rolesTable.isSystem,
      rolesTable.createdAt,
      rolesTable.updatedAt,
    )
    .get();

  if (!role) {
    throw new AdminServiceError("未找到指定角色。", 404);
  }

  return toAdminRole({
    ...role,
    memberCount: Number(role.memberCount ?? 0),
  });
}
