import { Hono } from "hono";
import { registerAuthRoutes } from "./modules/auth";
import HonoAppType from "./types/honoAppType";

const app = new Hono<HonoAppType>();

registerAuthRoutes(app);

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

export default app;
