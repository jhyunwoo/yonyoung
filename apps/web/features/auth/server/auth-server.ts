import {
  clearTimeoutController,
  createTimeoutController,
  resolveApiBaseUrl,
} from "@/shared/http/http";
import type { AuthSession } from "@/features/auth/model/auth-shared";

const SESSION_PATH = "/api/auth/get-session";
const SESSION_REQUEST_TIMEOUT_MS = 4000;

export const fetchSessionFromApi = async (
  cookieHeader: string | null,
): Promise<AuthSession | null> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const { controller, timeoutId } = createTimeoutController(SESSION_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${SESSION_PATH}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as unknown;
    if (body === null || typeof body !== "object") {
      return null;
    }

    if (!("session" in body) || !("user" in body)) {
      return null;
    }

    return body as AuthSession;
  } catch {
    return null;
  } finally {
    clearTimeoutController(timeoutId);
  }
};
