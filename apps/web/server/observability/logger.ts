import "server-only";
import { redact } from "@/server/observability/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogPayload = {
  event: string;
  status?: number;
  durationMs?: number;
  route?: string;
  method?: string;
  requestId?: string;
  traceId?: string;
  error?: unknown;
  [key: string]: unknown;
};

const emit = (level: LogLevel, payload: LogPayload): void => {
  const base = {
    ts: new Date().toISOString(),
    level,
    event: payload.event,
    requestId: payload.requestId,
    traceId: payload.traceId,
    route: payload.route,
    method: payload.method,
    status: payload.status,
    durationMs: payload.durationMs,
  };

  const merged = {
    ...payload,
    ...base,
  };

  const line = JSON.stringify(redact(merged));

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug") {
    console.debug(line);
    return;
  }

  console.log(line);
};

export const logger = {
  debug: (payload: LogPayload) => emit("debug", payload),
  info: (payload: LogPayload) => emit("info", payload),
  warn: (payload: LogPayload) => emit("warn", payload),
  error: (payload: LogPayload) => emit("error", payload),
};
