import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchSessionFromApi } from "./auth-server";
import { canAccessAdminPage } from "./auth-shared";
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

const requireSession = async (
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
};

const requireAdminPageAccess = async (
  redirectTo = SIGN_IN_PATH,
): Promise<AuthSession> => {
  const session = await getSession();

  if (!session || !canAccessAdminPage(session)) {
    redirect(redirectTo);
  }

  return session;
};

const redirectIfCanAccessAdmin = async (redirectTo = ADMIN_PATH): Promise<void> => {
  const session = await getSession();

  if (canAccessAdminPage(session)) {
    redirect(redirectTo);
  }
};

// Backward-compatible aliases
const requireAdminSession = requireAdminPageAccess;
const redirectIfAdmin = redirectIfCanAccessAdmin;

export const serverAuthTool = {
  getSession,
  requireSession,
  requireAdminPageAccess,
  redirectIfCanAccessAdmin,
  requireAdminSession,
  redirectIfAdmin,
} as const;
