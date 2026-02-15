import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { createAuth, getAuthCorsOrigins } from "../lib/auth";
import { unauthorized } from "../lib/http/response";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

export function registerAuthRoutes(app: App) {
  const authCorsOrigins = getAuthCorsOrigins();

  const authCors = cors({
    origin: (origin) => {
      if (!origin) {
        return authCorsOrigins[0] ?? "";
      }
      return authCorsOrigins.includes(origin) ? origin : "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.use("/api/auth/*", authCors);
  app.options("/api/auth/*", authCors);

  // 인증 문서는 로그인 세션이 있는 사용자만 접근 가능하게 제한한다.
  app.use("/api/auth/open-api/*", async (c, next) => {
    const auth = createAuth(c.env.db);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session?.user?.id) {
      return unauthorized(c);
    }
    await next();
  });

  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const auth = createAuth(c.env.db);
    return auth.handler(c.req.raw);
  });
}
