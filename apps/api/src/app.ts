import { Hono } from "hono";
import { registerAuthRoutes } from "./modules/auth";
import { registerGenerationRoutes } from "./modules/generations";
import { registerActivityRoutes } from "./modules/activities";
import { registerSupporterRoutes } from "./modules/supporters";
import { registerExhibitionRoutes } from "./modules/exhibitions";
import { registerLinktreeRoutes } from "./modules/linktree";
import { registerUserRoutes } from "./modules/users";
import { registerUploadRoutes } from "./modules/uploads";
import HonoAppType from "./types/honoAppType";
import {
  AppDependencies,
  createDefaultDependencies,
} from "./lib/services/dependencies";

export const createApp = (
  partialDependencies?: Partial<AppDependencies>,
) => {
  const app = new Hono<HonoAppType>();
  const dependencies = {
    ...createDefaultDependencies(),
    ...partialDependencies,
  };

  registerAuthRoutes(app);
  registerGenerationRoutes(app, dependencies);
  registerActivityRoutes(app, dependencies);
  registerSupporterRoutes(app, dependencies);
  registerExhibitionRoutes(app, dependencies);
  registerLinktreeRoutes(app, dependencies);
  registerUserRoutes(app, dependencies);
  registerUploadRoutes(app, dependencies);

  app.get("/message", (c) => {
    return c.text("Hello Hono!");
  });

  return app;
};

export type AppType = ReturnType<typeof createApp>;
