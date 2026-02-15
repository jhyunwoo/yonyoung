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
import HonoAppType from "./types/honoAppType";
import { getAuthCorsOrigins } from "./lib/auth";
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

export const createApp = (
  partialDependencies?: Partial<AppDependencies>,
) => {
  const app = new OpenAPIHono<HonoAppType>();
  const corsOrigins = getAuthCorsOrigins();
  const apiCors = cors({
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

  app.use("/api/*", apiCors);
  app.options("/api/*", apiCors);

  registerAuthRoutes(app);
  registerGenerationRoutes(app, dependencies);
  registerActivityRoutes(app, dependencies);
  registerSupporterRoutes(app, dependencies);
  registerExhibitionRoutes(app, dependencies);
  registerLinktreeRoutes(app, dependencies);
  registerUserRoutes(app, dependencies);
  registerUploadRoutes(app, dependencies);
  registerDocsRoutes(app, dependencies);

  app.openapi(messageRoute, (c) => {
    return c.text("Hello Hono!");
  });

  return app;
};

export type AppType = ReturnType<typeof createApp>;
