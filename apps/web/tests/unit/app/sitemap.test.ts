import { afterEach, describe, expect, it, vi } from "vitest";

const listPublicActivities = vi.hoisted(() => vi.fn());
const listPublicExhibitions = vi.hoisted(() => vi.fn());
vi.mock("@/features/public/services/public-read-service", () => ({
  listPublicActivities,
  listPublicExhibitions,
}));

import sitemap from "@/app/sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("sitemap.xml", () => {
  // Next는 <image:loc>에 값을 이스케이프 없이 넣는다. 관리자가 저장한 외부 이미지 주소에
  // `&`나 `<`가 있으면 사이트맵 전체가 깨지거나 임의 항목이 끼어든다.
  it("XML을 깨뜨릴 수 있는 이미지 주소는 싣지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    const safe =
      "https://example.com/api/public/media/activities/a/cover/x.jpg?sig=abc-_1";
    listPublicActivities.mockResolvedValue([
      { id: "a1", updatedAt: 1, coverImageUrl: safe },
      { id: "a2", updatedAt: 1, coverImageUrl: "https://evil.example/x.png?a=1&b=2" },
      {
        id: "a3",
        updatedAt: 1,
        coverImageUrl:
          "https://evil.example/x.png?q=</image:loc><url><loc>https://evil.example",
      },
    ]);
    listPublicExhibitions.mockResolvedValue([
      { id: "e1", updatedAt: 1, coverImageUrl: "https://evil.example/'x\".png" },
    ]);

    const entries = await sitemap();
    const imagesOf = (path: string) =>
      entries.find((entry) => entry.url === `https://example.com${path}`)?.images;

    expect(imagesOf("/archive/records/a1")).toEqual([safe]);
    expect(imagesOf("/archive/records/a2")).toEqual([]);
    expect(imagesOf("/archive/records/a3")).toEqual([]);
    expect(imagesOf("/archive/exhibitions/e1")).toEqual([]);
  });
});
