import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, getAuthCorsOrigins } from "./lib/auth";

const app = new Hono<{ Bindings: CloudflareBindings }>();
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

app.get("/message", (c) => {
  return c.text("Hello Hono!");
});

app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const auth = createAuth(c.env.db);
  return auth.handler(c.req.raw);
});

export default app;
