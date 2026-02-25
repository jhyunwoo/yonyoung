import { afterEach, describe, expect, it, vi } from "vitest";
import { createPageMetadata } from "./seo";
import { decodeOpenGraphImagePayload } from "./opengraph-image";

describe("createPageMetadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("페이지별 OG/Twitter 이미지 URL을 자동으로 포함한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const metadata = createPageMetadata({
      title: "전시회 | 연영회",
      description: "연영회의 전시 기록을 일정, 장소, 이미지와 함께 확인하세요.",
      path: "/archive/exhibitions",
    });

    const openGraphImageSource = metadata.openGraph?.images;
    const openGraphImages = Array.isArray(openGraphImageSource)
      ? openGraphImageSource
      : openGraphImageSource
        ? [openGraphImageSource]
        : [];
    expect(openGraphImages.length).toBeGreaterThan(0);

    const firstOpenGraphImage = openGraphImages[0];
    expect(firstOpenGraphImage).toBeTypeOf("object");
    expect(firstOpenGraphImage).not.toBeNull();

    const imageUrl =
      firstOpenGraphImage &&
      typeof firstOpenGraphImage === "object" &&
      "url" in firstOpenGraphImage
        ? firstOpenGraphImage.url?.toString()
        : null;

    expect(imageUrl).toContain("/og/");
    expect(imageUrl).toContain("/opengraph-image");

    const parsedImageUrl = new URL(imageUrl ?? "");
    const payload = parsedImageUrl.pathname.match(/^\/og\/([^/]+)\/opengraph-image$/u)?.[1];

    expect(decodeOpenGraphImagePayload(payload ?? "")).toEqual({
      title: "전시회 | 연영회",
      description: "연영회의 전시 기록을 일정, 장소, 이미지와 함께 확인하세요.",
      path: "/archive/exhibitions",
    });

    const twitterImageSource = metadata.twitter?.images;
    const twitterImages = Array.isArray(twitterImageSource)
      ? twitterImageSource
      : twitterImageSource
        ? [twitterImageSource]
        : [];
    expect(twitterImages[0]?.toString()).toBe(imageUrl);
  });
});
