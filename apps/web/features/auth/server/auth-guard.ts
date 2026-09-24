import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { fetchSessionFromApi } from "@/features/auth/server/auth-server";
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
import {
  asRecord,
  applyForwardedRequestContextHeaders,
  clearTimeoutController,
  createTimeoutController,
  readCookieHeader,
  resolveApiBaseUrl,
  unwrapDataEnvelope,
} from "@/shared/http/http";
import { readServerForwardedRequestContext } from "@/server/http/request-context";

const SIGN_IN_PATH = "/auth/sign-in";
const USER_PATH_PREFIX = "/api/users";
const CURRENT_USER_PATH = `${USER_PATH_PREFIX}/me`;
/** 프로필 조회는 보조 정보라 실패하면 세션 값으로 폴백한다. 렌더가 매달리지 않게 상한을 둔다. */
const PROFILE_REQUEST_TIMEOUT_MS = 8000;

const readTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizeProfileRecord = (value: unknown): Record<string, unknown> | null => {
  const source = asRecord(value);
  if (!source) {
    return null;
  }

  const output: Record<string, unknown> = {};

  const id = readTrimmedString(source.id);
  if (id) {
    output.id = id;
  }

  const stringOrNullFields = [
    "email",
    "name",
    "image",
    "familyName",
    "givenName",
    "college",
    "department",
    "studentNumber",
    "phoneNumber",
    "personalLink",
    "role",
    "generationId",
  ] as const;
  for (const key of stringOrNullFields) {
    const fieldValue = source[key];
    if (typeof fieldValue === "string" || fieldValue === null) {
      output[key] = fieldValue;
    }
  }

  if (typeof source.collaborationAvailable === "boolean") {
    output.collaborationAvailable = source.collaborationAvailable;
  }

  const showcaseImageUrls = source.showcaseImageUrls;
  if (Array.isArray(showcaseImageUrls)) {
    output.showcaseImageUrls = showcaseImageUrls.filter(
      (item): item is string => typeof item === "string",
    );
  }

  const generationIds = source.generationIds;
  if (Array.isArray(generationIds)) {
    output.generationIds = generationIds
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (
    typeof source.latestGenerationSortOrder === "number" &&
    Number.isFinite(source.latestGenerationSortOrder)
  ) {
    output.latestGenerationSortOrder = source.latestGenerationSortOrder;
  }

  return Object.keys(output).length > 0 ? output : null;
};

// React cache()로 요청 단위 dedupe: layout/page/액션이 각각 호출해도 API 왕복은 요청당 1회
const getSession = cache(async (): Promise<AuthSession | null> => {
  const cookieHeader = await readCookieHeader();
  return fetchSessionFromApi(cookieHeader);
});

/** 사용자 조회 요청에 붙일 헤더. 쿠키가 없으면 인증 없이 나가고 API 가 거절한다. */
const buildForwardedHeaders = async (): Promise<Headers> => {
  const cookieHeader = await readCookieHeader();
  const headers = new Headers({
    Accept: "application/json",
  });
  if (!cookieHeader) {
    return headers;
  }

  headers.set("cookie", cookieHeader);
  applyForwardedRequestContextHeaders(headers, await readServerForwardedRequestContext());
  return headers;
};

/**
 * `GET /api/users/me` — 세션을 인자로 받지 않는다.
 *
 * 쿠키만 있으면 되는 요청이라 세션 조회가 끝나기를 기다릴 이유가 없다. 이렇게
 * 떼어 두면 호출부가 `Promise.all([getSession(), getCurrentUserMe()])` 로 두 왕복을
 * 겹칠 수 있다 — 대시보드 진입 경로에서 직렬 왕복이 하나 줄어든다.
 * `cache()` 로 감싸 요청당 한 번만 나간다.
 */
const getCurrentUserMe = cache(async (): Promise<Record<string, unknown> | null> => {
  const headers = await buildForwardedHeaders();
  const { controller, timeoutId } = createTimeoutController(PROFILE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${CURRENT_USER_PATH}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return sanitizeProfileRecord(unwrapDataEnvelope(payload));
  } catch {
    return null;
  } finally {
    clearTimeoutController(timeoutId);
  }
});

// getSession이 캐시되어 동일 요청 내 session 객체 참조가 같으므로 인자 기반 dedupe가 성립
const getCurrentUserProfile = cache(
  async (session: AuthSession): Promise<Record<string, unknown> | null> => {
    const fromCurrentUser = await getCurrentUserMe();
    if (fromCurrentUser) {
      return fromCurrentUser;
    }

    const headers = await buildForwardedHeaders();

    try {
      const userByIdResponse = await fetch(
        `${resolveApiBaseUrl()}${USER_PATH_PREFIX}/${encodeURIComponent(session.user.id)}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        },
      );

      if (userByIdResponse.ok) {
        const payload = (await userByIdResponse.json().catch(() => null)) as unknown;
        return sanitizeProfileRecord(unwrapDataEnvelope(payload));
      }

      const normalizedEmail = session.user.email.trim().toLowerCase();
      if (normalizedEmail.length === 0) {
        return null;
      }

      const usersResponse = await fetch(`${resolveApiBaseUrl()}${USER_PATH_PREFIX}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!usersResponse.ok) {
        return null;
      }

      const usersPayload = (await usersResponse.json().catch(() => null)) as unknown;
      const users = unwrapDataEnvelope(usersPayload);
      if (!Array.isArray(users)) {
        return null;
      }

      const matchedUser = users.find((user) => {
        const userRecord = asRecord(user);
        const email = userRecord?.email;
        return (
          typeof email === "string" && email.trim().toLowerCase() === normalizedEmail
        );
      });

      return sanitizeProfileRecord(matchedUser);
    } catch {
      return null;
    }
  },
);

type AccessPredicate = (session: AuthSession) => boolean;

const requireSession = async (redirectTo = SIGN_IN_PATH): Promise<AuthSession> => {
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
  const profile =
    (await getCurrentUserProfile(session)) ?? sanitizeProfileRecord(session.user);
  if (!hasCompletedRequiredProfile(profile)) {
    redirect(redirectTo);
  }
};

const resolveAdminLandingPath = async (session: AuthSession): Promise<string> => {
  const profile =
    (await getCurrentUserProfile(session)) ?? sanitizeProfileRecord(session.user);
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
  getCurrentUserMe,
  requireSession,
  requireAccess,
  requireAdminPageAccess,
  requirePresidentAccess,
  requireGlobalUserManagementAccess,
  getCurrentUserProfile,
  redirectIfProfileIncomplete,
  resolveAdminLandingPath,
} as const;
