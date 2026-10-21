import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
  it("keeps the API private but lets crawlers fetch public media", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const { rules, sitemap } = robots();
    expect(rules).toEqual([
      {
        userAgent: "*",
        allow: ["/", "/api/public/media/"],
        disallow: "/api/",
      },
    ]);
    expect(sitemap).toBe("https://example.com/sitemap.xml");
  });
});
