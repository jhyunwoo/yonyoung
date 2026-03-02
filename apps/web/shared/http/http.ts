import type { ApiErrorEnvelope } from "@/shared/contracts/api-contracts";

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
