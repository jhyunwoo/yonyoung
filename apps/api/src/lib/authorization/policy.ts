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

/**
 * 역할 문자열을 내부 권한 역할로 정규화한다.
 * 기존 데이터 호환을 위해 "user" 값은 "member"로 취급한다.
 */
export const normalizeRole = (rawRole: string | null | undefined): Role => {
  switch (rawRole) {
    case "president":
    case "vice_president":
    case "manager":
    case "member":
      return rawRole;
    case "user":
    default:
      return "member";
  }
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
    // member는 users 일반 조회를 허용하지 않고 self-only 예외로 처리한다.
    user: { create: false, read: false, update: false, delete: false },
  },
};

export const can = (role: Role, resource: Resource, action: Action): boolean => {
  return permissionMatrix[role][resource][action];
};
