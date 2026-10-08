export const CORE_ROLE_VALUES = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
] as const;

export type CoreRole = (typeof CORE_ROLE_VALUES)[number];

/** 화면 표시용 역할 이름. 웹 `buildMemberRoleLabel`과 같은 값을 쓴다. */
export const CORE_ROLE_LABELS: Record<CoreRole, string> = {
  president: "회장",
  vice_president: "부회장",
  manager: "부장",
  new_member: "신입회원",
  associate_member: "준회원",
  regular_member: "정회원",
  unverified: "미승인",
};

export const ADMIN_ROLE_VALUES = [
  "president",
  "vice_president",
  "manager",
] as const;

export type AdminRole = (typeof ADMIN_ROLE_VALUES)[number];

export const MEMBER_LIKE_ROLE_VALUES = [
  "new_member",
  "associate_member",
  "regular_member",
] as const;

export type MemberLikeRole = (typeof MEMBER_LIKE_ROLE_VALUES)[number];

export const PRESIDENT_ROLE = "president";
export const UNVERIFIED_ROLE = "unverified";

/**
 * Normalize values persisted by older Better Auth deployments without making
 * the legacy `member` spelling part of the current role union.
 */
export const normalizeLegacyRole = (
  rawRole: string | null | undefined,
): CoreRole => {
  switch (rawRole) {
    case "president":
    case "vice_president":
    case "manager":
    case "new_member":
    case "associate_member":
    case "regular_member":
    case "unverified":
      return rawRole;
    case "member":
      return "regular_member";
    case null:
    case undefined:
    default:
      return UNVERIFIED_ROLE;
  }
};

export const isAdminRoleValue = (role: unknown): role is AdminRole =>
  typeof role === "string" &&
  (ADMIN_ROLE_VALUES as readonly string[]).includes(role);

export const isMemberLikeRoleValue = (role: unknown): role is MemberLikeRole =>
  typeof role === "string" &&
  (MEMBER_LIKE_ROLE_VALUES as readonly string[]).includes(role);

export const isUnverifiedRoleValue = (role: unknown): boolean =>
  typeof role === "string" && role.toLowerCase() === UNVERIFIED_ROLE;
