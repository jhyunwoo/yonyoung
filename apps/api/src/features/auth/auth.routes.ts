import { type OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "../../lib/auth";
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

export function registerAuthRoutes(app: App) {
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const requestOrigin = new URL(c.req.url).origin;
    const auth = createAuth(resolveD1Database(c.env), {
      ...c.env,
      BETTER_AUTH_URL: requestOrigin,
    });
    return auth.handler(restoreSecFetchMode(c.req.raw));
  });
}
