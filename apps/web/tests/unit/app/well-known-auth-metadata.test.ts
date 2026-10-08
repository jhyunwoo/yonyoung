import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("/.well-known/oauth-authorization-server/api/auth", () => {
  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("API의 인증 서버 메타데이터를 웹 오리진 기준으로 가져온다", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ issuer: "https://yonyoung.yonsei.ac.kr/api/auth" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/.well-known/oauth-authorization-server/api/auth/route");
    const response = await GET(
      new NextRequest("https://localhost:3000/.well-known/oauth-authorization-server/api/auth"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ issuer: "https://yonyoung.yonsei.ac.kr/api/auth" });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/api/auth/.well-known/oauth-authorization-server");
    expect((init?.headers as Headers).get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
  });
});
