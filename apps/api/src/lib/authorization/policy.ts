import { Action, Resource, Role } from "./types";

type PermissionMatrix = Record<Role, Record<Resource, Record<Action, boolean>>>;

const allTrue = {
  create: true,
  read: true,
  update: true,
  delete: true,
} as const;

const readOnly = {
  create: false,
  read: true,
  update: false,
  delete: false,
} as const;

const noAccess = {
  create: false,
  read: false,
  update: false,
  delete: false,
} as const;

const roleLevel: Record<Role, number> = {
  unverified: 0,
  member: 1,
  new_member: 1,
  associate_member: 1,
  regular_member: 1,
  manager: 2,
  vice_president: 3,
  president: 4,
};

/**
 * 역할 문자열을 내부 권한 역할로 정규화한다.
 * 알 수 없는 값은 보수적으로 "unverified"로 처리한다.
 */
export const normalizeRole = (rawRole: string | null | undefined): Role => {
  switch (rawRole) {
    case "president":
    case "vice_president":
    case "manager":
    case "member":
    case "new_member":
    case "associate_member":
    case "regular_member":
    case "unverified":
      return rawRole;
    default:
      return "unverified";
  }
};

export const canAssignRole = (
  actorRole: Role,
  targetRoleRaw: string | null | undefined,
): boolean => {
  const targetRole = normalizeRole(targetRoleRaw);
  return roleLevel[targetRole] <= roleLevel[actorRole];
};

export const isMemberLikeRole = (role: Role): boolean => {
  return (
    role === "member" ||
    role === "new_member" ||
    role === "associate_member" ||
    role === "regular_member"
  );
};

const permissionMatrix: PermissionMatrix = {
  president: {
    generation: { ...allTrue },
    activity: { ...allTrue },
    supporter: { ...allTrue },
    exhibition: { ...allTrue },
    linktree: { ...allTrue },
    user: { ...allTrue },
  },
  vice_president: {
    generation: { ...allTrue, delete: false },
    activity: { ...allTrue },
    supporter: { ...allTrue },
    exhibition: { ...allTrue },
    linktree: { ...allTrue },
    user: { ...allTrue },
  },
  manager: {
    generation: { ...readOnly },
    activity: { create: true, read: true, update: true, delete: true },
    supporter: { create: true, read: true, update: true, delete: true },
    exhibition: { create: true, read: true, update: true, delete: false },
    linktree: { create: true, read: true, update: true, delete: true },
    user: { ...readOnly },
  },
  member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    supporter: { ...readOnly },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    // member 계열 role은 users 일반 조회를 허용하지 않고 self-only 예외로 처리한다.
    user: { ...noAccess },
  },
  new_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    supporter: { ...readOnly },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  associate_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    supporter: { ...readOnly },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  regular_member: {
    generation: { ...readOnly },
    activity: { ...readOnly },
    supporter: { ...readOnly },
    exhibition: { ...readOnly },
    linktree: { ...readOnly },
    user: { ...noAccess },
  },
  unverified: {
    generation: { ...noAccess },
    activity: { ...noAccess },
    supporter: { ...noAccess },
    exhibition: { ...noAccess },
    linktree: { ...noAccess },
    user: { ...noAccess },
  },
};

export const can = (role: Role, resource: Resource, action: Action): boolean => {
  return permissionMatrix[role][resource][action];
};
