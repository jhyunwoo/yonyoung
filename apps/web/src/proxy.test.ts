import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const createRequest = (path: string, cookieHeader?: string): NextRequest => {
  return new NextRequest(`https://yonyoung.moveto.kr${path}`, {
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
  });
};

describe("proxy auth redirects", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated dashboard requests to sign-in", () => {
    const response = proxy(createRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://yonyoung.moveto.kr/auth/sign-in?next=%2Fdashboard",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });

  it("allows dashboard requests with a better-auth session cookie", () => {
    const response = proxy(
      createRequest("/dashboard", "better-auth.session_token=session-token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("allows auth routes without a session cookie", () => {
    const response = proxy(createRequest("/auth/sign-in"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("treats public home as cacheable even when session cookie exists", () => {
    const response = proxy(
      createRequest("/", "better-auth.session_token=session-token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=120, stale-while-revalidate=300",
    );
  });

  it("allows Cloudflare Insights beacon script in CSP", () => {
    vi.stubEnv("CSP_REPORT_ONLY", "true");
    const response = proxy(createRequest("/dashboard/settings/generations"));
    const csp = response.headers.get("content-security-policy-report-only");

    expect(csp).toContain("script-src");
    expect(csp).toContain("https://static.cloudflareinsights.com");
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("uses enforcing CSP header by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CSP_REPORT_ONLY", "");

    const response = proxy(createRequest("/"));

    expect(response.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();
  });
});
