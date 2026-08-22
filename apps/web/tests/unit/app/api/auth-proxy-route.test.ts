import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

describe("app/api/auth/[...path]/route", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://yonyoung.yonsei.ac.kr";
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = originalApiBaseUrl;
    }

    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the public site origin for OAuth authorization requests", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            url: "https://accounts.google.com/o/oauth2/v2/auth?state=test",
            redirect: false,
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "set-cookie":
                "__Secure-better-auth.state=signed-state; Path=/; HttpOnly; Secure; SameSite=Lax",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { POST } = await import("@/app/api/auth/[...path]/route");
    const request = new NextRequest("https://localhost:3000/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://yonyoung.yonsei.ac.kr",
        "sec-fetch-site": "same-origin",
        [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "https://yonyoung.yonsei.ac.kr/auth/sign-in",
        disableRedirect: true,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ["sign-in", "social"] }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "__Secure-better-auth.state=signed-state",
    );

    const [upstreamUrl, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;
    expect(upstreamUrl).toBe("https://api.example.com/api/auth/sign-in/social");
    expect(headers.get("origin")).toBe("https://yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });

  it("forwards the state cookie and public origin on the OAuth callback", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: "https://yonyoung.yonsei.ac.kr/auth/sign-in",
            "set-cookie":
              "__Secure-better-auth.session_token=session; Path=/; HttpOnly; Secure; SameSite=Lax",
          },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const { GET } = await import("@/app/api/auth/[...path]/route");
    const request = new NextRequest(
      "https://localhost:3000/api/auth/callback/google?code=oauth-code&state=oauth-state",
      {
        method: "GET",
        headers: {
          cookie: "__Secure-better-auth.state=signed-state",
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ["callback", "google"] }),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://yonyoung.yonsei.ac.kr/auth/sign-in",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "__Secure-better-auth.session_token=session",
    );

    const [upstreamUrl, init] = fetchSpy.mock.calls[0] ?? [];
    const headers = init?.headers as Headers;
    expect(upstreamUrl).toBe(
      "https://api.example.com/api/auth/callback/google?code=oauth-code&state=oauth-state",
    );
    expect(headers.get("cookie")).toBe("__Secure-better-auth.state=signed-state");
    expect(headers.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(headers.get("x-forwarded-proto")).toBe("https");
  });
});
