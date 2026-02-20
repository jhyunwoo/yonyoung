import {
  OpenAPIHono,
  type OpenAPIHonoOptions,
  createRoute,
  z,
} from "@hono/zod-openapi";
import type HonoAppType from "./types/honoAppType";
import { badRequest, notFound } from "./lib/http/response";
import {
  AppDependencies,
  createDefaultDependencies,
} from "./lib/services/dependencies";
import { apiCorsMiddleware } from "./middlewares/cors";
import { errorHandler } from "./middlewares/error-handler";
import { loggerMiddleware } from "./middlewares/logger";
import { requestIdMiddleware } from "./middlewares/request-id";
import { sessionMiddleware } from "./middlewares/session";
import { apiSecurityHeadersMiddleware } from "./middlewares/security-headers";
import { mountDomainRouters } from "./routes";

const messageRoute = createRoute({
  method: "get",
  path: "/message",
  tags: ["System"],
  operationId: "getMessage",
  responses: {
    200: {
      description: "헬스 체크 메시지",
      content: {
        "text/plain": {
          schema: z.string(),
        },
      },
    },
  },
});

export const createApp = (partialDependencies?: Partial<AppDependencies>) => {
  const defaultValidationHook: OpenAPIHonoOptions<HonoAppType>["defaultHook"] = (
    result,
    c,
  ) => {
    if (result.success) {
      return;
    }

    const message =
      result.error.issues
        .map((issue) => issue.message)
        .filter((text) => text.length > 0)
        .join(", ") || "요청 데이터가 올바르지 않습니다.";
    return badRequest(c, message);
  };

  const app = new OpenAPIHono<HonoAppType>({
    defaultHook: defaultValidationHook,
  });

  const dependencies = {
    ...createDefaultDependencies(),
    ...partialDependencies,
  };

  app.openAPIRegistry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "better-auth.session_token",
  });

  app.use("*", requestIdMiddleware);
  app.use("*", loggerMiddleware);

  app.use("*", async (c, next) => {
    const startedAt = c.get("startedAt") ?? performance.now();

    await next();

    const durationMs = performance.now() - startedAt;
    const timingMetric = `total;dur=${durationMs.toFixed(2)}`;
    const existing = c.res.headers.get("Server-Timing");
    c.res.headers.set(
      "Server-Timing",
      existing ? `${existing}, ${timingMetric}` : timingMetric,
    );
    c.res.headers.set("X-Response-Time", `${durationMs.toFixed(2)}ms`);
  });

  // Better Auth requires CORS to be configured before route registration.
  app.use("/api/*", apiCorsMiddleware);
  app.options("/api/*", apiCorsMiddleware);

  app.use("/api/*", apiSecurityHeadersMiddleware);
  app.use("/api/*", sessionMiddleware(dependencies));

  mountDomainRouters(app, dependencies, defaultValidationHook);

  app.openapi(messageRoute, (c) => {
    return c.text("Hello Hono!");
  });

  app.notFound((c) => notFound(c));
  app.onError(errorHandler);

  return app;
};
