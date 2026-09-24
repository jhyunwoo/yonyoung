import "server-only";
import { z } from "zod";
import { getApiBaseUrl } from "@/server/env";
import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";
import { readServerForwardedRequestContext } from "@/server/http/request-context";
import { applyForwardedRequestContextHeaders } from "@/shared/http/http";

const DataEnvelopeSchema = z.object({
  data: z.unknown(),
});

const ApiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

/** 2xx 응답이 계약 스키마와 맞지 않을 때의 오류 코드. 쓰기는 반영됐을 수 있다. */
export const INVALID_RESPONSE_CODE = "INVALID_RESPONSE";

export class HonoApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(input: {
    status: number;
    code?: string;
    message: string;
    requestId?: string | null;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "HonoApiError";
    this.status = input.status;
    this.code = input.code ?? "UNKNOWN";
    this.requestId = input.requestId ?? null;
  }
}

type HonoRequestOptions<TResponse> = {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
  responseSchema: z.ZodType<TResponse>;
  requestId?: string;
  traceId?: string;
  cookieHeader?: string | null;
};

const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

const tryReadJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
};

const extractData = <T>(payload: unknown, schema: z.ZodType<T>): T => {
  const envelope = DataEnvelopeSchema.safeParse(payload);
  const raw = envelope.success ? envelope.data.data : payload;
  return schema.parse(raw);
};

export const honoRequest = async <TResponse>(
  options: HonoRequestOptions<TResponse>,
): Promise<TResponse> => {
  const targetUrl = `${getApiBaseUrl()}${normalizePath(options.path)}`;

  const headers = new Headers({
    Accept: "application/json",
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requestId) {
    headers.set("x-request-id", options.requestId);
  }

  if (options.traceId) {
    headers.set("x-trace-id", options.traceId);
  }

  if (options.cookieHeader) {
    headers.set("cookie", options.cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: options.cache,
        next: options.next,
      },
      options.timeoutMs,
    );

    const payload = await tryReadJson(response);

    if (!response.ok) {
      const parsedError = ApiErrorEnvelopeSchema.safeParse(payload);
      if (parsedError.success) {
        throw new HonoApiError({
          status: response.status,
          code: parsedError.data.error.code,
          message: parsedError.data.error.message,
          requestId: parsedError.data.error.requestId ?? null,
        });
      }

      throw new HonoApiError({
        status: response.status,
        message: `API request failed with status ${response.status}`,
      });
    }

    try {
      return extractData(payload, options.responseSchema);
    } catch {
      // 2xx인데 계약과 다른 응답: 쓰기라면 서버에는 이미 반영됐을 수 있다.
      // 원시 Zod 메시지 대신 구분 가능한 코드로 알려 호출부가 캐시 무효화·재조회를 하게 한다.
      throw new HonoApiError({
        status: 502,
        code: INVALID_RESPONSE_CODE,
        message:
          "서버 응답을 해석하지 못했습니다. 요청은 처리되었을 수 있으니 새로고침해 결과를 확인해 주세요.",
        requestId: response.headers.get("x-request-id"),
      });
    }
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new HonoApiError({
        status: 408,
        code: "TIMEOUT",
        message: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      });
    }

    if (error instanceof HonoApiError) {
      throw error;
    }

    // fetch 자체가 실패한 경우(연결 거부·DNS 등). 내부 오류 문자열을 그대로 노출하지 않는다.
    throw new HonoApiError({
      status: 503,
      code: "API_UNAVAILABLE",
      message: "API 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      cause: error,
    });
  }
};
