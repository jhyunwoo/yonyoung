import type { Actor } from "../../lib/authorization/types";
import { withInternalActor } from "./internal-actor";

export type InternalDispatch = (
  request: Request,
  env: unknown,
  executionCtx?: ExecutionContext,
) => Response | Promise<Response>;

export type InternalApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type InternalApiQuery = Record<
  string,
  string | number | boolean | null | undefined
>;

export type InternalApiRequest = {
  method: InternalApiMethod;
  path: string;
  query?: InternalApiQuery;
  body?: unknown;
};

export type InternalApiFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
  requestId: string | null;
};

export type InternalApiResult =
  { ok: true; status: number; data: unknown } | InternalApiFailure;

export type InternalApiClient = {
  call: (request: InternalApiRequest) => Promise<InternalApiResult>;
};

const PATH_PARAM_PATTERN = /\{(\w+)\}/g;

/** `/api/activities/{id}` 같은 경로 템플릿을 채운다. 값은 경로 조각으로 인코딩한다. */
export const fillPath = (
  template: string,
  params: Record<string, string>,
): string =>
  template.replace(PATH_PARAM_PATTERN, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`경로 파라미터 ${key}가 없습니다.`);
    }
    return encodeURIComponent(value);
  });

type ErrorEnvelope = {
  error?: { code?: unknown; message?: unknown; requestId?: unknown };
};

const readFailure = async (response: Response): Promise<InternalApiFailure> => {
  const payload = (await response
    .json()
    .catch(() => null)) as ErrorEnvelope | null;
  const error = payload?.error;
  return {
    ok: false,
    status: response.status,
    code: typeof error?.code === "string" ? error.code : "UNKNOWN_ERROR",
    message:
      typeof error?.message === "string"
        ? error.message
        : "요청을 처리하지 못했습니다.",
    requestId: typeof error?.requestId === "string" ? error.requestId : null,
  };
};

/**
 * 기존 Hono 라우트를 같은 Worker 안에서 호출한다. 권한 가드·검증·감사 로그는
 * 라우트가 그대로 처리하므로 MCP 도구는 비즈니스 규칙을 다시 구현하지 않는다.
 */
export const createInternalApiClient = (input: {
  dispatch: InternalDispatch;
  env: unknown;
  executionCtx?: ExecutionContext;
  actor: Actor;
  origin: string;
  requestId: string;
}): InternalApiClient => {
  const env = withInternalActor(
    input.env as Record<string, unknown> | undefined,
    input.actor,
  );

  return {
    async call(request) {
      const url = new URL(request.path, input.origin);
      for (const [key, value] of Object.entries(request.query ?? {})) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      const headers = new Headers({
        accept: "application/json",
        "x-request-id": input.requestId,
      });
      let body: string | undefined;
      if (request.body !== undefined) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(request.body);
      }

      const response = await input.dispatch(
        new Request(url, { method: request.method, headers, body }),
        env,
        input.executionCtx,
      );

      if (!response.ok) {
        return readFailure(response);
      }
      if (response.status === 204) {
        return { ok: true, status: 204, data: null };
      }
      const payload = (await response.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      return { ok: true, status: response.status, data: payload?.data ?? null };
    },
  };
};
