import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next.config security headers", () => {
  it("sets security headers on non-API routes", async () => {
    const headersConfig = await nextConfig.headers?.();
    const routeConfig = headersConfig?.find((config) => config.source.includes("(?!api"));
    expect(routeConfig).toBeDefined();

    const headers = new Map(
      routeConfig?.headers.map((header) => [header.key, header.value]),
    );
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    // img-src는 광범위한 https: 대신 실제 미디어 호스트 allowlist여야 한다
    expect(headers.get("Content-Security-Policy")).toContain(
      "img-src 'self' data: blob: https://storage.yonyoung.moveto.kr https://*.googleusercontent.com",
    );
    expect(headers.get("Content-Security-Policy")).not.toContain(
      "img-src 'self' data: blob: https:;",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "connect-src 'self' https://*.r2.cloudflarestorage.com",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("restricts optimized remote image hosts to an allowlist", () => {
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];

    expect(remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "https",
          hostname: "yonyoung.yonsei.ac.kr",
          pathname: "/api/public/media/**",
        }),
        expect.objectContaining({ hostname: "storage.yonyoung.moveto.kr" }),
        expect.objectContaining({ hostname: "**.googleusercontent.com" }),
      ]),
    );
    expect(remotePatterns).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ hostname: "**" })]),
    );
  });

  it("public 의 테마 스크립트와 로고는 짧게 캐시하고 페이지 경로에는 걸리지 않는다", async () => {
    const headersConfig = await nextConfig.headers?.();
    const cacheConfig = headersConfig?.find((config) =>
      config.source.includes("theme-init"),
    );
    expect(cacheConfig?.headers).toEqual([
      {
        key: "Cache-Control",
        value: "public, max-age=3600, stale-while-revalidate=86400",
      },
    ]);
    const pattern = new RegExp(`^/${cacheConfig?.source.slice("/:file".length)}$`);
    expect(pattern.test("/theme-init.js")).toBe(true);
    expect(pattern.test("/android-chrome-512x512.png")).toBe(true);
    expect(pattern.test("/about")).toBe(false);
  });
});
