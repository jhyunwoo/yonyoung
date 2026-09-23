import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { captureException } from "@sentry/cloudflare";
import { errorHandler } from "../../src/app/middleware/errorHandler";
import type HonoAppType from "../../src/types/honoAppType";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn() }));
vi.mock("../../src/app/middleware/logger", () => ({ logError: vi.fn() }));

describe("Sentry handled API errors", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([true, false])(
    "preserves 500 response with Sentry enabled=%s",
    async (enabled) => {
      const app = new Hono<HonoAppType>();
      const failure = new Error("unexpected failure");
      app.onError(errorHandler);
      app.get("/", (c) => {
        c.set("requestId", "test-request");
        throw failure;
      });
      const response = await app.request(
        "/",
        {},
        enabled ? { SENTRY_DSN: "https://key@example.com/1" } : {},
      );
      expect(response.status).toBe(500);
      expect(captureException).toHaveBeenCalledTimes(enabled ? 1 : 0);
      if (enabled)
        expect(captureException).toHaveBeenCalledWith(failure, {
          tags: { requestId: "test-request", code: "INTERNAL_ERROR" },
        });
    },
  );

  it("does not report expected 4xx errors", async () => {
    const app = new Hono<HonoAppType>();
    app.onError(errorHandler);
    app.get("/", () => {
      throw new HTTPException(403);
    });
    const response = await app.request(
      "/",
      {},
      { SENTRY_DSN: "https://key@example.com/1" },
    );
    expect(response.status).toBe(403);
    expect(captureException).not.toHaveBeenCalled();
  });
});
