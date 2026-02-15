import type { AuthSession } from "./auth-shared";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const SESSION_PATH = "/api/auth/get-session";
const SESSION_REQUEST_TIMEOUT_MS = 4000;

/**
 * normalizeBaseUrl의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

/**
 * resolveAuthApiUrl 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const resolveAuthApiUrl = (): string => {
  const rawBaseUrl =
    process.env.AUTH_API_URL ??
    process.env.NEXT_PUBLIC_AUTH_API_URL ??
    DEFAULT_AUTH_API_URL;

  return normalizeBaseUrl(rawBaseUrl);
};

/**
 * fetchSessionFromApi 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @param cookieHeader 함수 로직에서 사용하는 입력값입니다.
 * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
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
        /**
     * setTimeout 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
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
