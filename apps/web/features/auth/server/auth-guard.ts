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
import { asRecord, readCookieHeader, unwrapDataEnvelope } from "@/shared/http/http";

const SIGN_IN_PATH = "/auth/sign-in";
const USER_PATH_PREFIX = "/api/users";

const getSession = async (): Promise<AuthSession | null> => {
  const cookieHeader = await readCookieHeader();
  return fetchSessionFromApi(cookieHeader);
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

    const payload = (await response.json().catch(() => null)) as unknown;
    return asRecord(unwrapDataEnvelope(payload));
  } catch {
    return null;
  }
};

type AccessPredicate = (session: AuthSession) => boolean;

const requireSession = async (
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
};

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

export const serverAuthGuard = {
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

/** @deprecated Use `serverAuthGuard` instead. Alias kept for migration. */
export const serverAuthTool = serverAuthGuard;
