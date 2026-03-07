import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

  it("forwards audit GET requests to the upstream API", async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "private, no-store, max-age=0",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/api/[...path]/route");
    const request = new NextRequest(
      "https://yonyoung.yonsei.ac.kr/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
      {
        method: "GET",
        headers: {
          cookie: "__Secure-better-auth.session_token=session-token",
          "x-request-id": "req-1",
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["audit", "activity", "fd3f8274-4f0a-4b5b-be59-0ca7918f710a"],
      }),
    });

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/api/audit/activity/fd3f8274-4f0a-4b5b-be59-0ca7918f710a?limit=20",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        redirect: "manual",
      }),
    );

    const [, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;
    expect(headers.get("cookie")).toBe("__Secure-better-auth.session_token=session-token");
    expect(headers.get("x-request-id")).toBe("req-1");
    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

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
});
