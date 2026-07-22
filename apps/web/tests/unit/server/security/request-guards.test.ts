import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  API_PROXY_BODY_LIMIT_BYTES,
  buildUpstreamProxyHeaders,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
  normalizeProxyPath,
} from "@/server/security/request-guards";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

const createRequest = (input: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}) =>
  new NextRequest(input.url ?? "https://app.example.com/api/market/items", {
    method: input.method ?? "POST",
    headers: input.headers,
  });

describe("server/security/request-guards", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      return;
    }

    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("allows same-origin state-changing requests with the CSRF header", () => {
    const request = createRequest({
      headers: {
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
    });

    expect(enforceSameOriginProtection(request, { requireCsrfHeader: true })).toBeNull();
  });

  it("uses the configured public site origin behind a reverse proxy", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";

    const publicOriginRequest = createRequest({
      url: "https://localhost:3000/api/auth/sign-in/social",
      headers: {
        origin: "https://yonyoung.yonsei.ac.kr",
        "sec-fetch-site": "same-origin",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
    });

    expect(
      enforceSameOriginProtection(publicOriginRequest, {
        requireCsrfHeader: true,
      }),
    ).toBeNull();

    const internalOriginRequest = createRequest({
      url: "https://localhost:3000/api/auth/sign-in/social",
      headers: {
        origin: "https://localhost:3000",
        "sec-fetch-site": "same-origin",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
    });
    const internalOriginResponse = enforceSameOriginProtection(internalOriginRequest, {
      requireCsrfHeader: true,
    });

    expect(internalOriginResponse?.status).toBe(403);
    await expect(internalOriginResponse?.json()).resolves.toEqual({
      ok: false,
      message: "Same-origin requests are required.",
    });
  });

  it("blocks cross-site or missing-origin mutation requests", async () => {
    const crossSiteRequest = createRequest({
      headers: {
        origin: "https://evil.example.com",
        "sec-fetch-site": "cross-site",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
    });
    const crossSiteResponse = enforceSameOriginProtection(crossSiteRequest, {
      requireCsrfHeader: true,
    });

    expect(crossSiteResponse?.status).toBe(403);
    await expect(crossSiteResponse?.json()).resolves.toMatchObject({
      ok: false,
    });

    const missingOriginRequest = createRequest({
      headers: {
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
    });
    expect(
      enforceSameOriginProtection(missingOriginRequest, { requireCsrfHeader: true })
        ?.status,
    ).toBe(403);
  });

  it("blocks oversized mutation requests before reading the body", () => {
    const request = createRequest({
      headers: {
        "content-length": String(API_PROXY_BODY_LIMIT_BYTES + 1),
        origin: "https://app.example.com",
      },
    });

    expect(enforceRequestBodyLimit(request, API_PROXY_BODY_LIMIT_BYTES)?.status).toBe(
      413,
    );
  });

  it("normalizes valid proxy paths and rejects blocked path traversal attempts", () => {
    expect(
      normalizeProxyPath({
        pathSegments: ["market", "items", "abc-123"],
        allowedPrefixes: ["market", "users"],
      }),
    ).toBe("market/items/abc-123");

    expect(
      normalizeProxyPath({
        pathSegments: ["auth", "callback"],
        allowedPrefixes: ["market", "auth"],
        blockedPrefixes: ["auth"],
      }),
    ).toBeNull();

    expect(
      normalizeProxyPath({
        pathSegments: ["market", "..", "items"],
        allowedPrefixes: ["market"],
      }),
    ).toBeNull();
  });

  it("forwards only the allowlisted upstream headers", () => {
    const request = createRequest({
      method: "GET",
      headers: {
        cookie: "session=abc",
        authorization: "Bearer should-not-forward",
        "x-request-id": "req-1",
        "x-trace-id": "trace-1",
      },
    });

    const headers = buildUpstreamProxyHeaders(request);

    expect(headers.get("cookie")).toBe("session=abc");
    expect(headers.get("x-request-id")).toBe("req-1");
    expect(headers.get("x-trace-id")).toBe("trace-1");
    expect(headers.get("authorization")).toBeNull();
  });
});
