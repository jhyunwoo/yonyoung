// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureBrowserException = vi.fn(() => Promise.resolve());
const initializeBrowserSentry = vi.fn(() => Promise.resolve(null));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null))),
  );
  vi.doMock("@/lib/observability/sentry-client", () => ({
    captureBrowserException,
    initializeBrowserSentry,
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.doUnmock("@/lib/observability/sentry-client");
});

describe("client instrumentation Sentry 시작", () => {
  it("SDK 는 유휴 시간에 받고, 그 전에 난 오류는 바로 넘긴 뒤 SDK 에 맡긴다", async () => {
    await import("@/instrumentation-client");
    expect(initializeBrowserSentry).not.toHaveBeenCalled();

    const early = new Error("early");
    window.dispatchEvent(new ErrorEvent("error", { error: early, message: "early" }));
    expect(captureBrowserException).toHaveBeenCalledWith(early);

    // captureBrowserException 이 끝나면 SDK 가 떠 있으므로 이후 오류는 SDK 전역 핸들러 몫이다.
    await vi.waitFor(() => Promise.resolve());
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("late") }));
    expect(captureBrowserException).toHaveBeenCalledOnce();

    // jsdom 에는 requestIdleCallback 이 없어 2초 타이머로 시작한다.
    await vi.advanceTimersByTimeAsync(2000);
    expect(initializeBrowserSentry).toHaveBeenCalledOnce();
  });
});
