"use client";

import { authClient } from "./auth-client";
import {
  canAccessAdminPage,
  canManageGenerations,
  getRoleFromSession,
  isPresidentRole,
  isUnverifiedRole,
} from "./auth-shared";
import type { AuthRole } from "./auth-shared";

const DEFAULT_AUTH_ERROR_MESSAGE =
  "인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export type AuthActionResult<T = undefined> =
  | {
      ok: true;
      data?: T;
    }
  | {
      ok: false;
      errorMessage: string;
    };

type SignInWithGoogleParams = {
  callbackURL?: string;
  disableRedirect?: boolean;
};

export const getAuthErrorMessage = (
  error: unknown,
  fallback = DEFAULT_AUTH_ERROR_MESSAGE,
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }

  return fallback;
};

export const signInWithGoogle = async ({
  callbackURL,
  disableRedirect = true,
}: SignInWithGoogleParams): Promise<AuthActionResult<{ redirectUrl: string }>> => {
  try {
    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      disableRedirect,
    });

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(response.error, "Google 로그인에 실패했습니다."),
      };
    }

    if (!disableRedirect) {
      return {
        ok: true,
      };
    }

    const redirectUrl = response.data?.url;
    if (!redirectUrl) {
      return {
        ok: false,
        errorMessage: "Google 로그인 리다이렉트 URL을 찾을 수 없습니다.",
      };
    }

    return {
      ok: true,
      data: {
        redirectUrl,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "Google 로그인에 실패했습니다."),
    };
  }
};

export const signInWithPasskey = async (): Promise<AuthActionResult> => {
  try {
    const response = await authClient.signIn.passkey();

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(response.error, "Passkey 로그인에 실패했습니다."),
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "Passkey 로그인에 실패했습니다."),
    };
  }
};

export const signOut = async (): Promise<AuthActionResult> => {
  try {
    const response = await authClient.signOut();

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(response.error, "로그아웃에 실패했습니다."),
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "로그아웃에 실패했습니다."),
    };
  }
};

export const useAuthSession = (): {
  data: ReturnType<typeof authClient.useSession>["data"];
  error: ReturnType<typeof authClient.useSession>["error"];
  isPending: ReturnType<typeof authClient.useSession>["isPending"];
  isRefetching: ReturnType<typeof authClient.useSession>["isRefetching"];
  refetch: ReturnType<typeof authClient.useSession>["refetch"];
  session: ReturnType<typeof authClient.useSession>["data"] | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  isUnverified: boolean;
  canAccessAdmin: boolean;
  isPresident: boolean;
  canManageGenerations: boolean;
} => {
  const sessionState = authClient.useSession();
  const session = sessionState.data ?? null;
  const role = getRoleFromSession(session);
  const isAuthenticated = Boolean(session);
  const isUnverified = isUnverifiedRole(role);
  const canAccessAdmin = canAccessAdminPage(session);
  const isPresident = isPresidentRole(role);
  const canManageGenerationsValue = canManageGenerations(session);

  return {
    ...sessionState,
    session,
    role,
    isAuthenticated,
    isUnverified,
    canAccessAdmin,
    isPresident,
    canManageGenerations: canManageGenerationsValue,
  };
};

// Backward-compatible wrappers
export const signInToAdminWithGoogle = (
  callbackURL: string,
): Promise<AuthActionResult<{ redirectUrl: string }>> =>
  signInWithGoogle({
    callbackURL,
    disableRedirect: true,
  });

export const signInToAdminWithPasskey = (): Promise<AuthActionResult> =>
  signInWithPasskey();

export const signOutCurrentUser = (): Promise<AuthActionResult> => signOut();

export const useClientAuthSession = () => useAuthSession();

export const clientAuthTool = {
  getErrorMessage: getAuthErrorMessage,
  signInWithGoogle,
  signInWithPasskey,
  signOut,
  useAuthSession,
  signInToAdminWithGoogle,
  signInToAdminWithPasskey,
  signOutCurrentUser,
  useClientAuthSession,
} as const;
