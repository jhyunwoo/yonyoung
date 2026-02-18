export type KnownAuthRole =
  | "president"
  | "vice_president"
  | "manager"
  | "member"
  | "new_member"
  | "associate_member"
  | "regular_member"
  | "unverified";
export type AuthRole = KnownAuthRole | (string & {});

const ADMIN_ROLES = ["president", "vice_president", "manager"] as const;
const PRESIDENT_ROLE = "president";
const UNVERIFIED_ROLE = "unverified";

type AdminRole = (typeof ADMIN_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  nickname?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  role?: AuthRole | null;
  generationId?: string | null;
};

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string | number;
  };
  user: AuthUser;
};

const REQUIRED_PROFILE_KEYS = [
  "familyName",
  "givenName",
  "college",
  "department",
  "studentNumber",
  "phoneNumber",
] as const;

type RequiredProfileKey = (typeof REQUIRED_PROFILE_KEYS)[number];

const readProfileField = (
  user: Record<string, unknown>,
  key: RequiredProfileKey,
): string | null => {
  const value = user[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const hasCompletedRequiredProfile = (
  user: Record<string, unknown> | null | undefined,
): boolean => {
  if (!user) {
    return false;
  }

  return REQUIRED_PROFILE_KEYS.every(
    /**
     * REQUIRED_PROFILE_KEYS.every 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @param key 함수 로직에서 사용하는 입력값입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    (key) => readProfileField(user, key) !== null,
  );
};

type SessionWithRole =
  | {
      user?: {
        role?: unknown;
        [key: string]: unknown;
      };
    }
  | null
  | undefined;

/**
 * getRoleFromSession 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getRoleFromSession = (session: SessionWithRole): AuthRole | null => {
  const rawRole = session?.user?.role;
  if (typeof rawRole !== "string" || rawRole.length === 0) {
    return null;
  }

  return rawRole as AuthRole;
};

/**
 * isAdminRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isAdminRole = (role: unknown): role is AdminRole =>
  typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);

/**
 * isAdminSession 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isAdminSession = (session: SessionWithRole): boolean =>
  isAdminRole(getRoleFromSession(session));

/**
 * isUnverifiedRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isUnverifiedRole = (role: unknown): boolean =>
  typeof role === "string" && role.toLowerCase() === UNVERIFIED_ROLE;

/**
 * isPresidentRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const isPresidentRole = (role: unknown): role is typeof PRESIDENT_ROLE =>
  typeof role === "string" && role === PRESIDENT_ROLE;

/**
 * canAccessAdminPage 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canAccessAdminPage = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return !isUnverifiedRole(getRoleFromSession(session));
};

/**
 * canManageGenerations 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const canManageGenerations = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return isPresidentRole(getRoleFromSession(session));
};
