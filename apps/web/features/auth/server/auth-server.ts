import {
  clearTimeoutController,
  createTimeoutController,
  resolveApiBaseUrl,
} from "@/shared/http/http";
import { applyForwardedRequestContextHeaders } from "@/shared/http/http";
import { readServerForwardedRequestContext } from "@/server/http/request-context";
import type { AuthSession } from "@/features/auth/model/auth-shared";

const SESSION_PATH = "/api/auth/get-session";
const SESSION_REQUEST_TIMEOUT_MS = 8000;

/**
 * 세션 API에 닿지 못했거나(타임아웃·연결 실패) 서버 오류가 난 경우.
 *
 * "로그인하지 않음"과 구분해야 한다. 둘을 같은 null로 다루면 API가 잠깐 느려질 때마다
 * 편집 중인 관리자가 로그인 화면으로 튕겨 나가 작성 중인 내용을 잃는다.
 * 이 오류는 대시보드 오류 경계(다시 시도)나 서버 액션 실패 결과로 처리한다.
 */
export class SessionUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", options);
    this.name = "SessionUnavailableError";
  }
}

export const isSessionUnavailableError = (
  error: unknown,
): error is SessionUnavailableError => error instanceof SessionUnavailableError;

/** 일시적인 서버 상태로 보고 재시도를 권해야 하는 응답 코드 */
const isTransientSessionStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
};

const readNonEmptyString = (
  source: Record<string, unknown>,
  key: string,
): string | null => {
  const value = source[key];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNullableString = (
  source: Record<string, unknown>,
  key: string,
): string | null => {
  const value = source[key];
  if (typeof value !== "string") {
    return null;
  }
  return value;
};

const readNullableNumber = (
  source: Record<string, unknown>,
  key: string,
): number | null => {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const readNullableBoolean = (
  source: Record<string, unknown>,
  key: string,
): boolean | null => {
  const value = source[key];
  return typeof value === "boolean" ? value : null;
};

const readOptionalStringArray = (
  source: Record<string, unknown>,
  key: string,
): string[] | undefined => {
  const value = source[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseSessionPayload = (payload: unknown): AuthSession | null => {
  const body = asRecord(payload);
  if (!body) {
    return null;
  }

  const sessionRecord = asRecord(body.session);
  const userRecord = asRecord(body.user);
  if (!sessionRecord || !userRecord) {
    return null;
  }

  const sessionId = readNonEmptyString(sessionRecord, "id");
  const sessionUserId = readNonEmptyString(sessionRecord, "userId");
  const rawExpiresAt = sessionRecord.expiresAt;
  const expiresAt =
    typeof rawExpiresAt === "string" || typeof rawExpiresAt === "number"
      ? rawExpiresAt
      : null;
  const userId = readNonEmptyString(userRecord, "id");
  const email = readNonEmptyString(userRecord, "email");
  const name = readNonEmptyString(userRecord, "name");

  if (!sessionId || !sessionUserId || expiresAt === null || !userId || !email || !name) {
    return null;
  }

  return {
    session: {
      id: sessionId,
      userId: sessionUserId,
      expiresAt,
    },
    user: {
      id: userId,
      email,
      name,
      image: readNullableString(userRecord, "image"),
      familyName: readNullableString(userRecord, "familyName"),
      givenName: readNullableString(userRecord, "givenName"),
      college: readNullableString(userRecord, "college"),
      department: readNullableString(userRecord, "department"),
      studentNumber: readNullableString(userRecord, "studentNumber"),
      phoneNumber: readNullableString(userRecord, "phoneNumber"),
      collaborationAvailable: readNullableBoolean(userRecord, "collaborationAvailable"),
      personalLink: readNullableString(userRecord, "personalLink"),
      role: readNonEmptyString(userRecord, "role"),
      generationId: readNonEmptyString(userRecord, "generationId"),
      generationIds: readOptionalStringArray(userRecord, "generationIds"),
      latestGenerationSortOrder: readNullableNumber(
        userRecord,
        "latestGenerationSortOrder",
      ),
    },
  };
};

export const fetchSessionFromApi = async (
  cookieHeader: string | null,
): Promise<AuthSession | null> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
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
      if (isTransientSessionStatus(response.status)) {
        throw new SessionUnavailableError();
      }
      // 401/403 등: 세션이 없거나 무효하다.
      return null;
    }

    const body = (await response.json().catch(() => null)) as unknown;
    return parseSessionPayload(body);
  } catch (error) {
    if (error instanceof SessionUnavailableError) {
      throw error;
    }
    throw new SessionUnavailableError({ cause: error });
  } finally {
    clearTimeoutController(timeoutId);
  }
};
