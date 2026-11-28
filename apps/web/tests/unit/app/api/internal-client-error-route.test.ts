import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock("@/server/observability/logger", () => ({
  logger,
}));

const createIngestRequest = (
  path: string,
  body: Record<string, unknown>,
  clientIp?: string,
) =>
  new NextRequest(`https://app.example.com${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.com",
      "sec-fetch-site": "same-origin",
      "x-request-id": "req-1",
      "x-trace-id": "trace-1",
      ...(clientIp ? { "x-real-ip": clientIp } : {}),
    },
    body: JSON.stringify(body),
  });

const createRequest = (body: Record<string, unknown>, clientIp?: string) =>
  createIngestRequest("/api/internal/client-error", body, clientIp);

const createWebVitalsRequest = (body: Record<string, unknown>, clientIp?: string) =>
  createIngestRequest("/api/internal/web-vitals", body, clientIp);

const validClientError = {
  event: "client.error",
  path: "/",
  message: "boom",
  sampledAt: 1700000000000,
};

const validWebVital = {
  id: "v1",
  name: "LCP",
  value: 1200,
  rating: "good",
  path: "/",
};

/** 라우트 상한(600)을 채울 때 클라이언트별 상한에 걸리지 않도록 요청마다 다른 IP를 쓴다. */
const clientIpAt = (index: number): string =>
  `10.0.${Math.floor(index / 256)}.${index % 256}`;

describe("app/api/internal/client-error/route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs router transition telemetry at info level with sanitized route details", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const response = await POST(
      createRequest({
        event: "router.transition.start",
        path: "/?email=user@example.com",
        metadata: {
          url: "/dashboard/members?email=user@example.com#frag",
          navigationType: "push",
        },
        sampledAt: 1700000000000,
      }),
    );

    expect(response.status).toBe(202);
    expect(logger.info).toHaveBeenCalledWith({
      event: "router.transition.start",
      route: "/",
      status: 202,
      requestId: "req-1",
      traceId: "trace-1",
      ingestPath: "/api/internal/client-error",
      ingestMethod: "POST",
      transition: {
        navigationType: "push",
        targetRoute: "/dashboard/members",
      },
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("keeps real client errors at warn level", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const response = await POST(
      createRequest({
        event: "client.error",
        path: "/dashboard?email=user@example.com",
        message: "TypeError: user@example.com leaked",
        stack: "Error: boom\n    at example (secret.js:1:1)",
        metadata: {
          email: "user@example.com",
          token: "secret-token",
        },
        sampledAt: 1700000000000,
      }),
    );

    expect(response.status).toBe(202);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "client.error",
      route: "/dashboard",
      status: 202,
      requestId: "req-1",
      traceId: "trace-1",
      ingestPath: "/api/internal/client-error",
      ingestMethod: "POST",
      error: {
        messagePresent: true,
        messageLength: 34,
        stackPresent: true,
        stackLineCount: 2,
        metadataKeyCount: 2,
        metadataKeys: ["email", "token"],
      },
    });
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("rejects an oversized body without relying on content-length", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const response = await POST(
      new NextRequest("https://app.example.com/api/internal/client-error", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://app.example.com",
          "sec-fetch-site": "same-origin",
        },
        body: "x".repeat(64 * 1024 + 1),
      }),
    );

    expect(response.status).toBe(413);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("라우트 상한(분당 600건)을 넘은 이벤트는 기록하지 않고 202로 버린다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    for (let index = 0; index < 600; index += 1) {
      await POST(createRequest(validClientError, clientIpAt(index)));
    }
    expect(logger.warn).toHaveBeenCalledTimes(600);

    const response = await POST(createRequest(validClientError, clientIpAt(600)));

    expect(response.status).toBe(202);
    expect(logger.warn).toHaveBeenCalledTimes(600);
  });

  it("상한은 라우트마다 따로라 client-error가 넘쳐도 web-vitals는 기록한다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const { POST: postWebVitals } = await import("@/app/api/internal/web-vitals/route");
    for (let index = 0; index <= 600; index += 1) {
      await POST(createRequest(validClientError, clientIpAt(index)));
    }
    expect(logger.warn).toHaveBeenCalledTimes(600);

    const response = await postWebVitals(
      createWebVitalsRequest(validWebVital, clientIpAt(0)),
    );

    expect(response.status).toBe(202);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it("본문 크기·스키마 검증에서 떨어진 요청은 상한을 쓰지 않는다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const oversizedBody = "x".repeat(64 * 1024 + 1);
    for (let count = 0; count < 61; count += 1) {
      const response = await POST(
        new NextRequest("https://app.example.com/api/internal/client-error", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "https://app.example.com",
            "sec-fetch-site": "same-origin",
            "x-real-ip": "203.0.113.7",
          },
          body: oversizedBody,
        }),
      );
      expect(response.status).toBe(413);
    }
    for (let count = 0; count < 700; count += 1) {
      const response = await POST(createRequest({ junk: count }, "203.0.113.7"));
      expect(response.status).toBe(400);
    }

    const response = await POST(createRequest(validClientError, "203.0.113.7"));

    expect(response.status).toBe(202);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("한 클라이언트(x-real-ip)는 분당 60건까지만 기록하고 나머지는 202로 버린다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    for (let count = 0; count < 60; count += 1) {
      await POST(createRequest(validClientError, "203.0.113.7"));
    }
    expect(logger.warn).toHaveBeenCalledTimes(60);

    const dropped = await POST(createRequest(validClientError, "203.0.113.7"));
    expect(dropped.status).toBe(202);
    expect(logger.warn).toHaveBeenCalledTimes(60);

    await POST(createRequest(validClientError, "203.0.113.8"));
    expect(logger.warn).toHaveBeenCalledTimes(61);
  });

  it("x-real-ip가 없는 요청은 한 클라이언트로 묶어 센다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    for (let count = 0; count < 61; count += 1) {
      await POST(createRequest(validClientError));
    }
    expect(logger.warn).toHaveBeenCalledTimes(60);

    await POST(createRequest(validClientError, "203.0.113.7"));
    expect(logger.warn).toHaveBeenCalledTimes(61);
  });

  it("1분이 지나면 클라이언트 상한이 다시 열린다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const startedAt = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(startedAt);
    for (let count = 0; count < 61; count += 1) {
      await POST(createRequest(validClientError, "203.0.113.7"));
    }
    expect(logger.warn).toHaveBeenCalledTimes(60);

    nowSpy.mockReturnValue(startedAt + 60_000);
    await POST(createRequest(validClientError, "203.0.113.7"));

    expect(logger.warn).toHaveBeenCalledTimes(61);
  });

  it("추적 헤더는 길이를 잘라 기록한다", async () => {
    const { POST } = await import("@/app/api/internal/client-error/route");
    const request = new NextRequest("https://app.example.com/api/internal/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
        "x-request-id": "r".repeat(4000),
      },
      body: JSON.stringify({ event: "client.error", path: "/", sampledAt: 1 }),
    });

    await POST(request);

    const [payload] = logger.warn.mock.calls[0] as [{ requestId: string }];
    expect(payload.requestId).toHaveLength(128);
  });
});

describe("app/api/internal/web-vitals/route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("검증에서 떨어진 요청은 상한을 쓰지 않고, 한 클라이언트는 분당 60건까지만 기록한다", async () => {
    const { POST } = await import("@/app/api/internal/web-vitals/route");
    for (let count = 0; count < 700; count += 1) {
      const response = await POST(createWebVitalsRequest({ junk: count }, "203.0.113.7"));
      expect(response.status).toBe(400);
    }

    for (let count = 0; count < 61; count += 1) {
      const response = await POST(createWebVitalsRequest(validWebVital, "203.0.113.7"));
      expect(response.status).toBe(202);
    }
    expect(logger.info).toHaveBeenCalledTimes(60);

    await POST(createWebVitalsRequest(validWebVital, "203.0.113.8"));
    expect(logger.info).toHaveBeenCalledTimes(61);
  });
});
