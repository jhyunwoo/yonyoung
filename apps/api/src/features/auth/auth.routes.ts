import { type OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { createAuth } from "../../lib/auth";
import { resolveDocsEnabled } from "../../lib/config/runtime-env";
import { resolveTrustedClientIp } from "../../lib/http/client-ip";
import { notFound } from "../../lib/http/response";
import { resolveD1Database } from "../../infra/db/client";
import type HonoAppType from "../../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

const FORWARDED_SEC_FETCH_MODE_HEADER = "x-forwarded-sec-fetch-mode";

/**
 * 웹 프록시(apps/web/app/api/auth/[...path]/route.ts)는 Node fetch로 호출해 sec-fetch-mode가 항상 cors다.
 * Better Auth는 이 값으로 302와 JSON 응답을 고르므로, 프록시가 넘긴 브라우저 원래 값으로 되돌린다.
 */
const restoreSecFetchMode = (request: Request): Request => {
  const forwarded = request.headers.get(FORWARDED_SEC_FETCH_MODE_HEADER);
  if (!forwarded) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("sec-fetch-mode", forwarded);
  headers.delete(FORWARDED_SEC_FETCH_MODE_HEADER);
  return new Request(request, { headers });
};

/**
 * 로그인 없이 D1에 쓰는 인증 경로의 방문자별 횟수 제한. 바인딩이 없는 환경(로컬·테스트)과
 * 한도 조회 실패는 통과시킨다 — 여기서 막히면 로그인·MCP 연결 자체가 불가능해진다.
 */
const limitByClientIp =
  (
    readLimiter: (env: HonoAppType["Bindings"]) => RateLimit | undefined,
    keyPrefix: string,
    description: string,
  ): MiddlewareHandler<HonoAppType> =>
  async (c, next) => {
    const limiter = readLimiter(c.env);
    if (limiter) {
      let allowed: boolean;
      try {
        const result = await limiter.limit({
          key: `${keyPrefix}:${resolveTrustedClientIp(c)}`,
        });
        allowed = result.success;
      } catch {
        allowed = true;
      }
      if (!allowed) {
        return c.json(
          {
            error: "too_many_requests",
            error_description: description,
            message: description,
          },
          429,
          { "Retry-After": "60", "Cache-Control": "no-store" },
        );
      }
    }
    await next();
  };

export function registerAuthRoutes(app: App) {
  // openAPI 플러그인의 disableDefaultReference는 HTML 문서만 끈다. 스키마 JSON은 다른 문서
  // 라우트와 같은 스위치를 따른다(문서 빌더는 auth.handler를 직접 불러 이 라우트를 거치지 않는다).
  app.get("/api/auth/open-api/*", async (c, next) => {
    if (!resolveDocsEnabled(c.env)) {
      return notFound(c);
    }
    await next();
  });

  // 동적 클라이언트 등록(DCR)은 로그인 없이 D1에 행을 만든다. 등록은 사용자가 새 MCP
  // 클라이언트를 연결할 때 한 번뿐이라 낮은 한도로도 충분하다.
  app.post(
    "/api/auth/oauth2/register",
    limitByClientIp(
      (env) => env.OAUTH_REGISTER_RATE_LIMITER,
      "oauth-register",
      "클라이언트 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    ),
  );

  // 로그인 시작도 로그인 없이 D1(verification)에 행을 만든다. Better Auth 내장 한도는
  // Workers에서 NODE_ENV를 읽지 못해 꺼져 있고, 켜더라도 isolate 메모리 기준이라 쓸 수 없다.
  app.post(
    "/api/auth/sign-in/*",
    limitByClientIp(
      (env) => env.AUTH_SIGN_IN_RATE_LIMITER,
      "auth-sign-in",
      "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    ),
  );

  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const requestOrigin = new URL(c.req.url).origin;
    const auth = createAuth(resolveD1Database(c.env), {
      ...c.env,
      BETTER_AUTH_URL: requestOrigin,
    });
    return auth.handler(restoreSecFetchMode(c.req.raw));
  });
}
