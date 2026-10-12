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
        dataCollection: expect.objectContaining({
          userInfo: false,
          cookies: false,
          httpBodies: [],
          genAI: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          graphQL: { document: false, variables: false },
        }),
        tracesSampleRate: 0,
      }),
    );
  });
  it("ignores RSC stream aborts caused by client disconnects", async () => {
    vi.stubEnv("SENTRY_DSN", "https://key@example.com/1");
    await import("../../sentry.server.config");
    const { ignoreErrors } = init.mock.calls[0][0];
    const isIgnored = (message: string) =>
      ignoreErrors.some((pattern: RegExp) => pattern.test(message));
    expect(isIgnored("The destination stream closed early.")).toBe(true);
    expect(isIgnored("The destination stream errored while writing data.")).toBe(false);
  });
});
