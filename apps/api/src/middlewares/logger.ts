import type { MiddlewareHandler } from "hono";
import type HonoAppType from "../types/honoAppType";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
]);

const redactHeaders = (headers: Headers): Record<string, string> => {
  const selected = ["user-agent", "content-type", "cf-connecting-ip", "cf-ray"];
  const snapshot: Record<string, string> = {};

  for (const key of selected) {
    const value = headers.get(key);
    if (!value) {
      continue;
    }

    snapshot[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? "[REDACTED]" : value;
  }

  return snapshot;
};

const logLine = (entry: Record<string, unknown>) => {
  console.log(JSON.stringify(entry));
};

export const loggerMiddleware: MiddlewareHandler<HonoAppType> = async (
  c,
  next,
) => {
  const startedAt = c.get("startedAt") ?? performance.now();

  try {
    await next();
  } finally {
    const latencyMs = performance.now() - startedAt;

    logLine({
      level: "info",
      timestamp: new Date().toISOString(),
      requestId: c.get("requestId") ?? null,
      method: c.req.method,
      route: c.req.path,
      status: c.res.status,
      latencyMs: Number(latencyMs.toFixed(2)),
      headers: redactHeaders(c.req.raw.headers),
    });
  }
};

export const logError = (
  c: { req: { method: string; path: string }; get: (key: "requestId") => string },
  error: unknown,
) => {
  const message = error instanceof Error ? error.message : String(error);

  logLine({
    level: "error",
    timestamp: new Date().toISOString(),
    requestId: c.get("requestId"),
    method: c.req.method,
    route: c.req.path,
    message,
  });
};
