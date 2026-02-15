import type { AuthSession } from "./auth-shared";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const SESSION_PATH = "/api/auth/get-session";
const SESSION_REQUEST_TIMEOUT_MS = 4000;

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");
export type { AuthRole, AuthSession, AuthUser } from "./auth-shared";
export {
  AUTH_ROLE_VALUES,
  getRoleFromSession,
  canAccessAdminPage,
  canManageGenerations,
  isPresidentRole,
  isAdminRole,
  isAdminSession,
  isUnverifiedRole,
} from "./auth-shared";

export const resolveAuthApiUrl = (): string => {
  const rawBaseUrl =
    process.env.AUTH_API_URL ??
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    DEFAULT_AUTH_API_URL;

  return normalizeBaseUrl(rawBaseUrl);
};

export const fetchSessionFromApi = async (
  cookieHeader: string | null,
): Promise<AuthSession | null> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    SESSION_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(`${resolveAuthApiUrl()}${SESSION_PATH}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as unknown;
    if (body === null) {
      return null;
    }

    if (typeof body !== "object") {
      return null;
    }

    if (!("session" in body) || !("user" in body)) {
      return null;
    }

    return body as AuthSession;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
