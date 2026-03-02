import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { fetchSessionFromApi, resolveAuthApiUrl } from "@/features/auth/server/auth-server";
import {
  AUTH_PROFILE_PATH,
  DASHBOARD_PATH,
  canAccessAdminPage,
  canManageGenerations,
  canManageGlobalUsers,
  hasCompletedRequiredProfile,
  resolvePostSignInPath,
} from "@/features/auth/model/auth-shared";
import type { AuthSession } from "@/features/auth/model/auth-shared";

const SIGN_IN_PATH = "/auth/sign-in";
const USER_PATH_PREFIX = "/api/users";

/**
 * readCookieHeader 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const readCookieHeader = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return cookieHeader.length > 0 ? cookieHeader : null;
};

/**
 * getSession 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const getSession = async (): Promise<AuthSession | null> => {
  const cookieHeader = await readCookieHeader();
  return fetchSessionFromApi(cookieHeader);
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
};

const unwrapDataEnvelope = (value: unknown): unknown => {
  const record = asRecord(value);
  if (record && "data" in record) {
    return record.data;
  }
  return value;
};

const getCurrentUserProfile = async (
  session: AuthSession,
): Promise<Record<string, unknown> | null> => {
  const cookieHeader = await readCookieHeader();
  const headers = new Headers({
    Accept: "application/json",
  });
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    const response = await fetch(
      `${resolveAuthApiUrl()}${USER_PATH_PREFIX}/${session.user.id}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(/** response.json().catch 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => null)) as unknown;
    return asRecord(unwrapDataEnvelope(payload));
  } catch {
    return null;
  }
};

type AccessPredicate = (session: AuthSession) => boolean;

/**
 * requireSession의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
const requireSession = async (
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
};

/**
 * requireAccess의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param predicate 함수 로직에서 사용하는 입력값입니다.
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
const requireAccess = async (
  predicate: AccessPredicate,
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await getSession();

  if (!session || !predicate(session)) {
    redirect(redirectTo);
  }

  return session;
};

/**
 * requireAdminPageAccess의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
const requireAdminPageAccess = async (
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await requireSession(redirectTo);

  if (!canAccessAdminPage(session)) {
    forbidden();
  }

  return session;
};

const redirectIfProfileIncomplete = async (
  session: AuthSession,
  redirectTo = AUTH_PROFILE_PATH,
): Promise<void> => {
  const profile = (await getCurrentUserProfile(session)) ?? asRecord(session.user);
  if (!hasCompletedRequiredProfile(profile)) {
    redirect(redirectTo);
  }
};

const resolveAdminLandingPath = async (
  session: AuthSession,
): Promise<string> => {
  const profile = (await getCurrentUserProfile(session)) ?? asRecord(session.user);
  const isProfileComplete = hasCompletedRequiredProfile(profile);

  return resolvePostSignInPath({
    role: session.user.role,
    isProfileComplete,
  });
};

/**
 * requirePresidentAccess의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const requirePresidentAccess = async (
  redirectTo = DASHBOARD_PATH,
): Promise<AuthSession> => {
  const session = await requireAccess(canManageGenerations, redirectTo);
  await redirectIfProfileIncomplete(session);
  return session;
};

const requireGlobalUserManagementAccess = async (): Promise<AuthSession> => {
  const session = await requireSession(SIGN_IN_PATH);

  if (!canManageGlobalUsers(session)) {
    forbidden();
  }

  await redirectIfProfileIncomplete(session);
  return session;
};

export const serverAuthTool = {
  getSession,
  requireSession,
  requireAccess,
  requireAdminPageAccess,
  requirePresidentAccess,
  requireGlobalUserManagementAccess,
  getCurrentUserProfile,
  redirectIfProfileIncomplete,
  resolveAdminLandingPath,
} as const;
