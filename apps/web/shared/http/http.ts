import type { ApiErrorEnvelope, DataEnvelope } from "@/shared/contracts/api-contracts";

export type { DataEnvelope } from "@/shared/contracts/api-contracts";

export const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

export const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

export const resolveBaseUrl = (
  candidates: Array<string | undefined | null>,
  fallback: string,
): string => {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return normalizeBaseUrl(trimmed);
      }
    }
  }

  return normalizeBaseUrl(fallback);
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseApiErrorEnvelope = (value: unknown): ApiErrorEnvelope | null => {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const code = value.error.code;
  const message = value.error.message;
  const requestId = value.error.requestId;
  if (
    typeof code !== "string" ||
    typeof message !== "string" ||
    typeof requestId !== "string"
  ) {
    return null;
  }

  return {
    error: {
      code,
      message,
      requestId,
    },
  } as ApiErrorEnvelope;
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    requestId?: string | null;
  }) {
    super(input.message);
    this.name = "AdminApiError";
    this.status = input.status;
    this.code = input.code ?? "UNKNOWN";
    this.requestId = input.requestId ?? null;
  }
}

export const createTimeoutController = (timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
};

export const clearTimeoutController = (timeoutId: ReturnType<typeof setTimeout>): void => {
  clearTimeout(timeoutId);
};

export const parseJsonBody = async (response: Response): Promise<unknown> => {
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

// ---------------------------------------------------------------------------
// Shared type guards & data helpers
// ---------------------------------------------------------------------------

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  return value as Record<string, unknown>;
};



export const unwrapDataEnvelope = <T>(payload: unknown): T | null => {
  const record = asRecord(payload);
  if (record && "data" in record) {
    return (record as DataEnvelope<T>).data ?? null;
  }
  return payload as T;
};

// ---------------------------------------------------------------------------
// Cookie header (server-only)
// ---------------------------------------------------------------------------

export const readCookieHeader = async (): Promise<string | null> => {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader.length > 0 ? cookieHeader : null;
};

// ---------------------------------------------------------------------------
// Centralised API base URL resolution
// ---------------------------------------------------------------------------

const DEFAULT_DEV_API_URL = "http://localhost:8787";
const DEFAULT_PROD_API_URL = "https://api.yonyoung.moveto.kr";

export const resolveApiBaseUrl = (options?: {
  clientSide?: boolean;
}): string => {
  const isClient = options?.clientSide ?? typeof window !== "undefined";
  const isProd = process.env.NODE_ENV === "production";

  if (isClient) {
    return resolveBaseUrl(
      [process.env.NEXT_PUBLIC_AUTH_API_URL],
      isProd ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL,
    );
  }

  return resolveBaseUrl(
    [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
    isProd ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL,
  );
};
