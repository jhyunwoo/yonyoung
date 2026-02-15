import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { createAuth, getAuthCorsOrigins } from "../lib/auth";
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

  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const auth = createAuth(c.env.db);
    return auth.handler(c.req.raw);
  });
}
