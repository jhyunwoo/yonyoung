import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { fetchSessionFromApi } from "./auth-server";
import { canAccessAdminPage, canManageGenerations } from "./auth-shared";
import type { AuthSession } from "./auth-shared";

const SIGN_IN_PATH = "/auth/sign-in";
const ADMIN_PATH = "/admin";

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

/**
 * requirePresidentAccess의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const requirePresidentAccess = async (
  redirectTo = ADMIN_PATH,
): Promise<AuthSession> => requireAccess(canManageGenerations, redirectTo);

/**
 * redirectIfAccess의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param predicate 함수 로직에서 사용하는 입력값입니다.
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 권한/인증 분기에서 잘못된 흐름이 발생하지 않도록 호출 순서를 유지해야 합니다.
 */
const redirectIfAccess = async (
  predicate: AccessPredicate,
  redirectTo = ADMIN_PATH,
): Promise<void> => {
  const session = await getSession();

  if (session && predicate(session)) {
    redirect(redirectTo);
  }
};

/**
 * redirectIfCanAccessAdmin의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const redirectIfCanAccessAdmin = async (redirectTo = ADMIN_PATH): Promise<void> =>
  redirectIfAccess(canAccessAdminPage, redirectTo);

/**
 * redirectIfPresident의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param redirectTo 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const redirectIfPresident = async (redirectTo = ADMIN_PATH): Promise<void> =>
  redirectIfAccess(canManageGenerations, redirectTo);

// Backward-compatible aliases
const requireAdminSession = requireAdminPageAccess;
const redirectIfAdmin = redirectIfCanAccessAdmin;

export const serverAuthTool = {
  getSession,
  requireSession,
  requireAccess,
  requireAdminPageAccess,
  requirePresidentAccess,
  redirectIfAccess,
  redirectIfCanAccessAdmin,
  redirectIfPresident,
  requireAdminSession,
  redirectIfAdmin,
} as const;
