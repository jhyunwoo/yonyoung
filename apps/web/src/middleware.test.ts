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

  it("treats public home as cacheable even when session cookie exists", () => {
    const response = middleware(
      createRequest("/", "better-auth.session_token=session-token"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, s-maxage=120, stale-while-revalidate=300",
    );
  });

  it("allows Cloudflare Insights beacon script in CSP", () => {
    const previousCspReportOnly = process.env.CSP_REPORT_ONLY;
    try {
      process.env.CSP_REPORT_ONLY = "true";
      const response = middleware(createRequest("/dashboard/settings/generations"));
      const csp = response.headers.get("content-security-policy-report-only");

      expect(csp).toContain("script-src");
      expect(csp).toContain("https://static.cloudflareinsights.com");
      expect(response.headers.get("content-security-policy")).toBeNull();
      expect(response.headers.get("permissions-policy")).toContain("camera=()");
    } finally {
      if (typeof previousCspReportOnly === "string") {
        process.env.CSP_REPORT_ONLY = previousCspReportOnly;
      } else {
        delete process.env.CSP_REPORT_ONLY;
      }
    }
  });

  it("uses enforcing CSP header by default in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCspReportOnly = process.env.CSP_REPORT_ONLY;

    try {
      process.env.NODE_ENV = "production";
      delete process.env.CSP_REPORT_ONLY;

      const response = middleware(createRequest("/"));

      expect(response.headers.get("content-security-policy")).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers.get("content-security-policy-report-only")).toBeNull();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (typeof previousCspReportOnly === "string") {
        process.env.CSP_REPORT_ONLY = previousCspReportOnly;
      } else {
        delete process.env.CSP_REPORT_ONLY;
      }
    }
  });
});
