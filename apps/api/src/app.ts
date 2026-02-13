import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createAuth } from "@yonyoung/auth/server";
import { runMigrations, type AppContextEnv } from "@yonyoung/db";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { fail, ok } from "./lib/http";
import { healthRoute } from "./openapi/routes";
import { OPENAPI_TAGS } from "./openapi/schemas";
import { adminStack } from "./stacks/admin";
import { publicStack } from "./stacks/public";

const app = new OpenAPIHono<AppContextEnv>();

let migrationPromise: Promise<void> | null = null;

app.use("*", logger());
app.use("*", cors());
app.use("*", async (c, next) => {
  const hasDb = (c.env as Partial<{ DB: unknown }> | undefined)?.DB;
  if (!hasDb) {
    await next();
    return;
  }

  if (!migrationPromise) {
    migrationPromise = runMigrations(c.env.DB).catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }

  await migrationPromise;
  await next();
});

const routes = app
  .openapi(healthRoute, (c) => ok(c, { status: "ok" as const, now: new Date().toISOString() }))
  .on(["GET", "POST"], "/api/auth/*", async (c) => {
    const auth = createAuth(c.env);
    return auth.handler(c.req.raw);
  })
  .route("/v1/public", publicStack)
  .route("/v1/admin", adminStack);

app.doc31("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Yonsei Yonyoung API",
    version: "1.0.0",
    description: "Public and admin API for Yonsei Yonyoung website"
  },
  tags: [
    { name: OPENAPI_TAGS.system, description: "System endpoints" },
    { name: OPENAPI_TAGS.public, description: "Public read endpoints" },
    { name: OPENAPI_TAGS.admin, description: "Admin management endpoints" }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token"
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer"
      }
    }
  }
} as never);

app.get("/docs", swaggerUI({
  url: "/openapi.json"
}));

app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "Internal Server Error");
});

export type ApiAppType = typeof routes;

export default app;
