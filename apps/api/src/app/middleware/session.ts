import { captureException } from "@sentry/cloudflare";
import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";
import type { AppDependencies } from "../../lib/services/dependencies";
import { logger } from "../../shared/logging/logger";

const SKIP_SESSION_PREFIXES = [
  "/api/auth",
  "/api/public",
  "/api/openapi.json",
  "/api/status",
  "/api/docs",
  "/doc",
  "/ui",
  "/health",
] as const;

const shouldSkipSessionResolution = (path: string): boolean =>
  SKIP_SESSION_PREFIXES.some((prefix) => path.startsWith(prefix));

export const sessionMiddleware = (
  dependencies: AppDependencies,
): MiddlewareHandler<HonoAppType> => {
  return async (c, next) => {
    c.set("actor", null);

    if (!shouldSkipSessionResolution(c.req.path) && (c.env?.db || c.env?.DB)) {
      c.set("actorResolved", true);
      try {
        c.set("actor", await dependencies.resolveActor(c));
      } catch (error) {
        // 세션 해석 실패는 인증 실패로 닫는다(fail closed). 다만 원인은 반드시 기록해
        // 설정 누락·DB 장애가 "이유 없는 401"로 묻히지 않게 한다.
        c.set("actor", null);
        logger.error({
          event: "session.resolve_failed",
          requestId: c.get("requestId"),
          path: c.req.path,
          error: error instanceof Error ? error.message : String(error),
        });
        captureException(error, { tags: { event: "session.resolve_failed" } });
      }
    }

    await next();
  };
};
