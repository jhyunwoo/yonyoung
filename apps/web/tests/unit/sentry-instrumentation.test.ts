import { afterEach, describe, expect, it, vi } from "vitest";
const init = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ init }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});

describe("Sentry server initialization", () => {
  it("does not initialize without a DSN", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    await import("../../sentry.server.config");
    expect(init).not.toHaveBeenCalled();
  });
  it("uses the server DSN with tracing and PII disabled", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@example.com/1");
    await import("../../sentry.server.config");
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@example.com/1",
        sendDefaultPii: false,
        tracesSampleRate: 0,
      }),
    );
  });
});
