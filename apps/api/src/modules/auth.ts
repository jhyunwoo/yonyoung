import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "../lib/auth";
import HonoAppType from "../types/honoAppType";

type App = OpenAPIHono<HonoAppType>;

export function registerAuthRoutes(app: App) {
  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    const auth = createAuth(c.env.db);
    return auth.handler(c.req.raw);
  });
}
