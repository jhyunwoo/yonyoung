import { afterEach, describe, expect, it, vi } from "vitest";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import { createPageMetadata } from "@/features/seo/metadata/seo";

afterEach(() => vi.unstubAllEnvs());

describe("public search metadata", () => {
  it("uses the production canonical origin without an environment override", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    const metadata = createPageMetadata(PAGE_SEO.home);
    expect(String(metadata.alternates?.canonical)).toBe("https://yonyoung.yonsei.ac.kr/");
    expect(metadata.title).toContain("대학교 사진 동아리");
    expect(metadata.description).toContain("정기 출사");
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      description: metadata.description,
      locale: "ko_KR",
    });
    expect(metadata.twitter).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
  });

  it("keeps distinct canonical URLs and titles for introduction and recruitment", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const pages = [PAGE_SEO.home, PAGE_SEO.about, PAGE_SEO.recruiting];
    const metadata = pages.map(createPageMetadata);
    expect(new Set(metadata.map((page) => page.title)).size).toBe(pages.length);
    for (const [index, page] of metadata.entries()) {
      expect(String(page.alternates?.canonical)).toBe(
        `https://example.com${pages[index].path}`,
      );
      expect(page.title).toContain("대학교 사진 동아리");
    }
  });
});
