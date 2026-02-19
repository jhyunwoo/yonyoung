import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { registerAuthRoutes } from "./modules/auth";
import { registerGenerationRoutes } from "./modules/generations";
import { registerActivityRoutes } from "./modules/activities";
import { registerSupporterRoutes } from "./modules/supporters";
import { registerExhibitionRoutes } from "./modules/exhibitions";
import { registerLinktreeRoutes } from "./modules/linktree";
import { registerUserRoutes } from "./modules/users";
import { registerUploadRoutes } from "./modules/uploads";
import { registerDocsRoutes } from "./modules/docs";
import { registerPublicRoutes } from "./modules/public";
import { registerDashboardRoutes } from "./modules/dashboard";
import HonoAppType from "./types/honoAppType";
import { getAuthCorsOrigins } from "./lib/auth";
import { badRequest } from "./lib/http/response";
import {
  AppDependencies,
  createDefaultDependencies,
} from "./lib/services/dependencies";

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

/**
 * createApp 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param partialDependencies 함수 로직에서 사용하는 입력값입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const createApp = (
  partialDependencies?: Partial<AppDependencies>,
) => {
  const app = new OpenAPIHono<HonoAppType>({
        /**
     * defaultHook의 핵심 비즈니스 로직을 수행합니다.
     * @param result 응답 데이터 또는 응답 객체입니다.
     * @param c 요청/실행 컨텍스트 객체입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }

      const message =
        result.error.issues
          .map(/** result.error.issues
          .map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param issue 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (issue) => issue.message)
          .filter(/** result.error.issues
          .map((issue) => issue.message)
          .filter 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param text 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (text) => text.length > 0)
          .join(", ") || "요청 데이터가 올바르지 않습니다.";
      return badRequest(c, message);
    },
  });
  const corsOrigins = getAuthCorsOrigins();
  const apiCors = cors({
        /**
     * origin의 핵심 비즈니스 로직을 수행합니다.
     * @param origin 함수 로직에서 사용하는 입력값입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    origin: (origin) => {
      if (!origin) {
        return corsOrigins[0] ?? "";
      }

      return corsOrigins.includes(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
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

  app.use("*", async (c, next) => {
    const startedAt = performance.now();

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

  app.use("/api/*", apiCors);
  app.options("/api/*", apiCors);

  registerAuthRoutes(app);
  registerGenerationRoutes(app, dependencies);
  registerActivityRoutes(app, dependencies);
  registerSupporterRoutes(app, dependencies);
  registerExhibitionRoutes(app, dependencies);
  registerLinktreeRoutes(app, dependencies);
  registerPublicRoutes(app, dependencies);
  registerUserRoutes(app, dependencies);
  registerDashboardRoutes(app, dependencies);
  registerUploadRoutes(app, dependencies);
  registerDocsRoutes(app, dependencies);

  app.openapi(messageRoute, /** app.openapi 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param c 요청/실행 컨텍스트 객체입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (c) => {
    return c.text("Hello Hono!");
  });

  return app;
};
