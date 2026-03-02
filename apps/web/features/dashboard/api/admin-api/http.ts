import type { DataEnvelope } from "@/shared/contracts/api-contracts";
import {
  AdminApiError,
  clearTimeoutController,
  createTimeoutController,
  isRecord,
  normalizePath,
  parseApiErrorEnvelope,
  parseJsonBody,
  resolveBaseUrl,
} from "@/shared/http/http";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const DEFAULT_PRODUCTION_AUTH_API_URL = "https://api.yonyoung.moveto.kr";
const ADMIN_API_BASE_PATH = "/api";
const REQUEST_TIMEOUT_MS = 45_000;

type AdminRequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestBody = unknown;

const resolveAdminApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    if (process.env.NODE_ENV !== "production") {
      return resolveBaseUrl(
        [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
        DEFAULT_AUTH_API_URL,
      );
    }

    return resolveBaseUrl(
      [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
      DEFAULT_PRODUCTION_AUTH_API_URL,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    return resolveBaseUrl(
      [process.env.NEXT_PUBLIC_AUTH_API_URL],
      DEFAULT_AUTH_API_URL,
    );
  }

  return resolveBaseUrl(
    [process.env.NEXT_PUBLIC_AUTH_API_URL],
    DEFAULT_PRODUCTION_AUTH_API_URL,
  );
};

export const adminRequest = async <T>(
  path: string,
  method: AdminRequestMethod,
  body?: RequestBody,
): Promise<T> => {
  const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT_MS);

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

    const rawBody = await parseJsonBody(response);

    if (!response.ok) {
      const envelope = parseApiErrorEnvelope(rawBody);
      if (envelope) {
        throw new AdminApiError({
          status: response.status,
          code: envelope.error.code,
          message: envelope.error.message,
          requestId: envelope.error.requestId,
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
    clearTimeoutController(timeoutId);
  }
};
