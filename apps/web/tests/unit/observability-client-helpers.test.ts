// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { reportClientError } from "@/lib/observability/report-client-error";
import { shouldSample } from "@/lib/observability/sampling";

describe("shouldSample", () => {
  it("비율 1 이상은 전부, 0 이하는 하나도 통과시키지 않는다", () => {
    expect(shouldSample(1, "any")).toBe(true);
    expect(shouldSample(0, "any")).toBe(false);
  });

  it("같은 key 는 항상 같은 결과다", () => {
    const keys = Array.from({ length: 50 }, (_, index) => `metric-${index}`);
    const first = keys.map((key) => shouldSample(0.3, key));
    expect(keys.map((key) => shouldSample(0.3, key))).toEqual(first);
  });
});

describe("reportClientError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("오류 경계의 오류를 샘플링 없이 client-error 로 보낸다", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const error = new Error("render failure");

    reportClientError(error);

    expect(sendBeacon).toHaveBeenCalledOnce();
    const [endpoint, blob] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(endpoint).toBe("/api/internal/client-error");
    expect(blob.type).toBe("application/json; charset=utf-8");
    expect(JSON.parse(await blob.text())).toEqual({
      event: "client.error",
      path: window.location.pathname,
      message: "render failure",
      stack: error.stack,
      sampledAt: 1_700_000_000_000,
    });
  });
});
