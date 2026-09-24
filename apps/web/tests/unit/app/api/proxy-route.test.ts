import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

describe("app/api/[...path]/route", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    {
      label: "audit GET requests",
      method: "GET",
      url: "https://yonyoung.yonsei.ac.kr/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
      path: ["audit", "activity", "fd3f8274-4f0a-4b5b-be59-0ca7918f710a"],
      upstreamUrl:
        "https://api.example.com/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
    },
    {
      label: "recruiting image presign requests",
      method: "POST",
      url: "https://yonyoung.yonsei.ac.kr/api/recruiting/presign/image",
      path: ["recruiting", "presign", "image"],
      upstreamUrl: "https://api.example.com/api/recruiting/presign/image",
    },
    {
      label: "recruiting image presign requests",
      method: "POST",
      url: "https://yonyoung.yonsei.ac.kr/api/recruiting/presign/image",
      path: ["recruiting", "presign", "image"],
      upstreamUrl: "https://api.example.com/api/recruiting/presign/image",
    },
  ])(
    "forwards $label to the upstream API",
    async ({ method, path, upstreamUrl, url }) => {
      const fetchSpy = vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "private, no-store, max-age=0",
            },
          }),
      );
      vi.stubGlobal("fetch", fetchSpy);

      const handlers = await import("@/app/api/[...path]/route");
      const request = new NextRequest(url, {
        method,
        headers: {
          cookie: "__Secure-better-auth.session_token=session-token",
          origin: "https://yonyoung.yonsei.ac.kr",
          "sec-fetch-site": "same-origin",
          "x-request-id": "req-1",
          ...(method === "POST" ? { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } : {}),
        },
      });

      const handler = method === "POST" ? handlers.POST : handlers.GET;
      const response = await handler(request, {
        params: Promise.resolve({ path }),
      });

      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        upstreamUrl,
        expect.objectContaining({
          method,
          cache: "no-store",
          redirect: "manual",
        }),
      );

      const [, init] = fetchSpy.mock.calls[0] ?? [];
      const headers = init?.headers as Headers;
      expect(headers.get("cookie")).toBe(
        "__Secure-better-auth.session_token=session-token",
      );
      expect(headers.get("x-request-id")).toBe("req-1");
      expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
      expect(headers.get("x-forwarded-proto")).toBe("https");
    },
  );

  it("returns 404 for blocked or unknown proxy prefixes", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/api/[...path]/route");
    const request = new NextRequest("https://yonyoung.yonsei.ac.kr/api/unknown/path", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["unknown", "path"],
      }),
    });

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a stable gateway error when the upstream API request fails", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/api/[...path]/route");
    const request = new NextRequest("https://yonyoung.yonsei.ac.kr/api/users", {
      method: "GET",
      headers: {
        cookie: "__Secure-better-auth.session_token=session-token",
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["users"],
      }),
    });

    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Upstream API request failed.",
    });
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });
  it("업스트림의 Set-Cookie가 여러 개여도 모두 전달한다", async () => {
    const upstreamHeaders = new Headers({ "content-type": "application/json" });
    upstreamHeaders.append("set-cookie", "a=1; Path=/; HttpOnly");
    upstreamHeaders.append("set-cookie", "b=2; Path=/; HttpOnly");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200, headers: upstreamHeaders })),
    );

    const handlers = await import("@/app/api/[...path]/route");
    const request = new NextRequest("https://yonyoung.yonsei.ac.kr/api/users/me", {
      method: "GET",
      headers: {
        origin: "https://yonyoung.yonsei.ac.kr",
        "sec-fetch-site": "same-origin",
      },
    });

    const response = await handlers.GET(request, {
      params: Promise.resolve({ path: ["users", "me"] }),
    });

    expect(response.headers.getSetCookie()).toEqual([
      "a=1; Path=/; HttpOnly",
      "b=2; Path=/; HttpOnly",
    ]);
  });

  it("공유 비밀이 설정되면 방문자 IP를 API에 전달하고, 들어온 위조 헤더는 버린다", async () => {
    process.env.PROXY_CLIENT_IP_SECRET = "shared-secret-for-client-ip";
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    try {
      const handlers = await import("@/app/api/[...path]/route");
      const request = new NextRequest(
        "https://yonyoung.yonsei.ac.kr/api/public/page-views",
        {
          method: "POST",
          headers: {
            origin: "https://yonyoung.yonsei.ac.kr",
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.7, 10.0.0.1",
            "x-yonyoung-client-ip": "198.51.100.1",
            "x-yonyoung-proxy-auth": "forged",
            [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
          },
          body: JSON.stringify({ pageType: "home" }),
        },
      );

      await handlers.POST(request, {
        params: Promise.resolve({ path: ["public", "page-views"] }),
      });

      const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
      const headers = init.headers as Headers;
      expect(headers.get("x-yonyoung-client-ip")).toBe("203.0.113.7");
      expect(headers.get("x-yonyoung-proxy-auth")).toBe("shared-secret-for-client-ip");
    } finally {
      delete process.env.PROXY_CLIENT_IP_SECRET;
    }
  });

  it("공유 비밀이 없으면 방문자 IP 헤더를 보내지 않는다", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const handlers = await import("@/app/api/[...path]/route");
    const request = new NextRequest("https://yonyoung.yonsei.ac.kr/api/users/me", {
      method: "GET",
      headers: {
        origin: "https://yonyoung.yonsei.ac.kr",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "203.0.113.7",
        "x-yonyoung-proxy-auth": "forged",
      },
    });

    await handlers.GET(request, { params: Promise.resolve({ path: ["users", "me"] }) });

    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get("x-yonyoung-client-ip")).toBeNull();
    expect(headers.get("x-yonyoung-proxy-auth")).toBeNull();
  });
});
