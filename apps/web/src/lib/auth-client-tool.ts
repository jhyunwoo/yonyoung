"use client";

import { authClient } from "./auth-client";
import { isAdminRole } from "./auth-shared";

const DEFAULT_AUTH_ERROR_MESSAGE =
  "인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

type AuthActionResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      errorMessage: string;
    };

type RedirectAuthActionResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      errorMessage: string;
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

export const signInToAdminWithGoogle = async (
  callbackURL: string,
): Promise<RedirectAuthActionResult> => {
  try {
    const response = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      disableRedirect: true,
    });

    if (response.error) {
      return {
        ok: false,
        errorMessage: getAuthErrorMessage(response.error, "Google 로그인에 실패했습니다."),
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
      redirectUrl,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage: getAuthErrorMessage(error, "Google 로그인에 실패했습니다."),
    };
  }
};

export const signInToAdminWithPasskey = async (): Promise<AuthActionResult> => {
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

export const signOutCurrentUser = async (): Promise<AuthActionResult> => {
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

export const useClientAuthSession = () => {
  const sessionState = authClient.useSession();
  const session = sessionState.data ?? null;
  const role =
    session &&
    typeof session.user === "object" &&
    session.user !== null &&
    "role" in session.user &&
    typeof session.user.role === "string"
      ? session.user.role
      : null;

  return {
    ...sessionState,
    session,
    role,
    isAuthenticated: Boolean(session),
    isAdmin: isAdminRole(role),
  };
};

export const clientAuthTool = {
  getErrorMessage: getAuthErrorMessage,
  signInToAdminWithGoogle,
  signInToAdminWithPasskey,
  signOutCurrentUser,
  useClientAuthSession,
} as const;
