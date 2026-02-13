import type { Context } from "hono";

export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({ data }, status as never);
}

export function fail(c: Context, status: number, message: string, details?: unknown) {
  return c.json(
    {
      error: {
        message,
        details
      }
    },
    status as never
  );
}
