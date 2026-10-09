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
        new Response(
          JSON.stringify({ issuer: "https://yonyoung.yonsei.ac.kr/api/auth" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } =
      await import("@/app/.well-known/oauth-authorization-server/api/auth/route");
    const response = await GET(
      new NextRequest(
        "https://localhost:3000/.well-known/oauth-authorization-server/api/auth",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      issuer: "https://yonyoung.yonsei.ac.kr/api/auth",
    });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://api.example.com/api/auth/.well-known/oauth-authorization-server",
    );
    expect((init?.headers as Headers).get("x-forwarded-host")).toBe(
      "yonyoung.yonsei.ac.kr",
    );
  });

  const url = "https://localhost:3000/.well-known/oauth-authorization-server/api/auth";
  const load = async () =>
    (await import("@/app/.well-known/oauth-authorization-server/api/auth/route")).GET;

  it("성공 응답만 5분 캐시한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const response = await (await load())(new NextRequest(url));
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("업스트림 오류는 캐시하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 })),
    );
    const response = await (await load())(new NextRequest(url));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("쿠키와 인증 헤더를 업스트림에 보내지 않는다", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    await (
      await load()
    )(new NextRequest(url, { headers: { cookie: "a=b", authorization: "Bearer x" } }));
    const init = (fetchSpy.mock.calls[0] as unknown[])[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
  });

  it("타임아웃은 504이고 캐시하지 않는다", async () => {
    const { FetchTimeoutError } = await import("@/server/http/fetch-with-timeout");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new FetchTimeoutError(10_000);
      }),
    );
    const response = await (await load())(new NextRequest(url));
    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
