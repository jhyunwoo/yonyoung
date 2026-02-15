import {
  AdminApiError,
  type ApiErrorEnvelope,
  type DataEnvelope,
} from "./types";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const ADMIN_API_BASE_PATH = "/api";
const REQUEST_TIMEOUT_MS = 12_000;

export type AdminRequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

type JsonLike = Record<string, unknown>;

/**
 * normalizeBaseUrl의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

/**
 * resolveAdminApiBaseUrl 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const resolveAdminApiBaseUrl = (): string => {
  const fromPublic = process.env.NEXT_PUBLIC_AUTH_API_URL;
  return normalizeBaseUrl(fromPublic ?? DEFAULT_AUTH_API_URL);
};

/**
 * normalizePath의 핵심 비즈니스 로직을 수행합니다.
 * @param path 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const normalizePath = (path: string): string => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

/**
 * isRecord 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const isRecord = (value: unknown): value is JsonLike =>
  typeof value === "object" && value !== null;

/**
 * parseErrorEnvelope 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseErrorEnvelope = (value: unknown): ApiErrorEnvelope | null => {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const code = value.error.code;
  const message = value.error.message;
  if (typeof code !== "string" || typeof message !== "string") {
    return null;
  }

  return {
    error: {
      code,
      message,
    },
  } as ApiErrorEnvelope;
};

/**
 * parseBody 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param response 응답 데이터 또는 응답 객체입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return text.length > 0 ? text : null;
  }

  return response.json();
};

/**
 * adminRequest의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param path 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param method 함수 로직에서 사용하는 입력값입니다.
 * @param body 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
export const adminRequest = async <T>(
  path: string,
  method: AdminRequestMethod,
  body?: unknown,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(/** setTimeout 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const hasBody = body !== undefined;
    const response = await fetch(
      `${resolveAdminApiBaseUrl()}${ADMIN_API_BASE_PATH}${normalizePath(path)}`,
      {
      method,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: hasBody
        ? {
            "Content-Type": "application/json",
            Accept: "application/json",
          }
        : {
          Accept: "application/json",
        },
      body: hasBody ? JSON.stringify(body) : undefined,
      },
    );

    const rawBody = await parseBody(response);

    if (!response.ok) {
      const envelope = parseErrorEnvelope(rawBody);
      if (envelope) {
        throw new AdminApiError({
          status: response.status,
          code: envelope.error.code,
          message: envelope.error.message,
        });
      }

      if (isRecord(rawBody) && typeof rawBody.message === "string") {
        throw new AdminApiError({
          status: response.status,
          message: rawBody.message,
        });
      }

      throw new AdminApiError({
        status: response.status,
        message: `요청 처리에 실패했습니다. (HTTP ${response.status})`,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (isRecord(rawBody) && "data" in rawBody) {
      return (rawBody as DataEnvelope<T>).data;
    }

    return rawBody as T;
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AdminApiError({
        status: 408,
        code: "TIMEOUT",
        message: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      });
    }

    throw new AdminApiError({
      status: 500,
      code: "UNKNOWN",
      message:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
};
