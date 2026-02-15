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

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const resolveAdminApiBaseUrl = (): string => {
  const fromPublic = process.env.NEXT_PUBLIC_AUTH_API_URL;
  return normalizeBaseUrl(fromPublic ?? DEFAULT_AUTH_API_URL);
};

const normalizePath = (path: string): string => {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
};

const isRecord = (value: unknown): value is JsonLike =>
  typeof value === "object" && value !== null;

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

export const adminRequest = async <T>(
  path: string,
  method: AdminRequestMethod,
  body?: unknown,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
