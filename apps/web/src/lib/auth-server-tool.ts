import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSessionFromApi } from "./auth-server";
import { canAccessAdminPage, canManageGenerations } from "./auth-shared";
import type { AuthSession } from "./auth-shared";

const SIGN_IN_PATH = "/auth/sign-in";
const ADMIN_PATH = "/admin";

const readCookieHeader = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return cookieHeader.length > 0 ? cookieHeader : null;
};

const getSession = async (): Promise<AuthSession | null> => {
  const cookieHeader = await readCookieHeader();
  return fetchSessionFromApi(cookieHeader);
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
): Promise<AuthSession> => requireAccess(canAccessAdminPage, redirectTo);

const requirePresidentAccess = async (
  redirectTo = ADMIN_PATH,
): Promise<AuthSession> => requireAccess(canManageGenerations, redirectTo);

const redirectIfAccess = async (
  predicate: AccessPredicate,
  redirectTo = ADMIN_PATH,
): Promise<void> => {
  const session = await getSession();

  if (session && predicate(session)) {
    redirect(redirectTo);
  }
};

const redirectIfCanAccessAdmin = async (redirectTo = ADMIN_PATH): Promise<void> =>
  redirectIfAccess(canAccessAdminPage, redirectTo);

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
