import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

const createRequest = (path: string, cookieHeader?: string): NextRequest => {
  return new NextRequest(`https://yonyoung.moveto.kr${path}`, {
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
  });
};

describe("middleware auth redirects", () => {
  it("redirects unauthenticated dashboard requests to sign-in", () => {
    const response = middleware(createRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://yonyoung.moveto.kr/auth/sign-in?next=%2Fdashboard",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("allows dashboard requests with a better-auth session cookie", () => {
    const response = middleware(
      createRequest("/dashboard", "better-auth.session_token=session-token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows auth routes without a session cookie", () => {
    const response = middleware(createRequest("/auth/sign-in"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows Cloudflare Insights beacon script in CSP", () => {
    const response = middleware(createRequest("/dashboard/settings/generations"));
    const csp = response.headers.get("content-security-policy-report-only");

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://static.cloudflareinsights.com");
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });
});
