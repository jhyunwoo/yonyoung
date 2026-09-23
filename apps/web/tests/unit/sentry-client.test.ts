import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrubSentryEvent } from "@/lib/observability/sentry";

const init = vi.fn();
const captureException = vi.fn();
const loadSdk = vi.fn();

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@sentry.invalid/1");
  vi.doMock("@sentry/nextjs", () => {
    loadSdk();
    return { init, captureException };
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.doUnmock("@sentry/nextjs");
});

describe("browser Sentry loading", () => {
  it("does not load the SDK without a DSN, even when an error is reported", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const client = await import("@/lib/observability/sentry-client");
    expect(await client.initializeBrowserSentry()).toBeNull();
    await client.captureBrowserException(new Error("render error"));
    expect(loadSdk).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("shares initialization and reports concurrent errors after initialization", async () => {
    const client = await import("@/lib/observability/sentry-client");
    const first = new Error("first error");
    const second = new Error("second error");
    await Promise.all([
      client.initializeBrowserSentry(),
      client.captureBrowserException(first),
      client.captureBrowserException(second),
    ]);
    expect(loadSdk).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://key@sentry.invalid/1",
        sendDefaultPii: false,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        enableLogs: false,
        beforeSend: expect.any(Function),
      }),
    );
    const scrub = init.mock.calls[0][0].beforeSend;
    expect(scrub({ request: { url: "https://example.com/?token=secret" } })).toEqual(
      scrubSentryEvent({ request: { url: "https://example.com/?token=secret" } }),
    );
    expect(captureException.mock.calls).toEqual([[first], [second]]);
    expect(init.mock.invocationCallOrder[0]).toBeLessThan(
      captureException.mock.invocationCallOrder[0],
    );
  });

  it("contains SDK load failures", async () => {
    loadSdk.mockImplementationOnce(() => {
      throw new Error("chunk unavailable");
    });
    const client = await import("@/lib/observability/sentry-client");
    await expect(
      client.captureBrowserException(new Error("original")),
    ).resolves.toBeUndefined();
    expect(await client.initializeBrowserSentry()).toBeNull();
  });

  it("contains initialization failures", async () => {
    init.mockImplementationOnce(() => {
      throw new Error("init failed");
    });
    const client = await import("@/lib/observability/sentry-client");
    await expect(
      client.captureBrowserException(new Error("original")),
    ).resolves.toBeUndefined();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("contains capture failures", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("capture failed");
    });
    const client = await import("@/lib/observability/sentry-client");
    await expect(
      client.captureBrowserException(new Error("original")),
    ).resolves.toBeUndefined();
  });
});
