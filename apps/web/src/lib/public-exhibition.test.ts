import { describe, expect, it } from "vitest";
import type { ApiExhibition } from "./admin-api/types";
import { pickFeaturedPublicExhibition } from "./public-exhibition";

const createExhibition = (
  id: string,
  input: {
    startDate: number;
    endDate: number;
    title?: string;
  },
): ApiExhibition => ({
  id,
  title: input.title ?? id,
  startDate: input.startDate,
  endDate: input.endDate,
  generationId: "generation-1",
  place: "신촌",
  coverImageUrl: "https://example.com/exhibition-cover.jpg",
  description: "exhibition description",
  createdAt: 0,
  updatedAt: 0,
  updatedBy: null,
  detailImages: [],
});

describe("pickFeaturedPublicExhibition", () => {
  it("진행중/예정 전시가 있으면 시작일이 가장 이른 전시를 선택한다", () => {
    const now = Date.parse("2026-02-17T00:00:00.000Z");
    const exhibitions: ApiExhibition[] = [
      createExhibition("future-late", {
        startDate: Date.parse("2026-04-10T00:00:00.000Z"),
        endDate: Date.parse("2026-04-20T00:00:00.000Z"),
      }),
      createExhibition("ongoing", {
        startDate: Date.parse("2026-02-10T00:00:00.000Z"),
        endDate: Date.parse("2026-02-22T00:00:00.000Z"),
      }),
      createExhibition("future-soon", {
        startDate: Date.parse("2026-03-01T00:00:00.000Z"),
        endDate: Date.parse("2026-03-10T00:00:00.000Z"),
      }),
    ];

    const featured = pickFeaturedPublicExhibition(exhibitions, now);

    expect(featured?.id).toBe("ongoing");
  });

  it("진행중/예정 전시가 없으면 가장 최근 종료 전시를 선택한다", () => {
    const now = Date.parse("2026-02-17T00:00:00.000Z");
    const exhibitions: ApiExhibition[] = [
      createExhibition("past-old", {
        startDate: Date.parse("2025-10-01T00:00:00.000Z"),
        endDate: Date.parse("2025-10-10T00:00:00.000Z"),
      }),
      createExhibition("past-recent", {
        startDate: Date.parse("2026-01-01T00:00:00.000Z"),
        endDate: Date.parse("2026-01-20T00:00:00.000Z"),
      }),
      createExhibition("past-middle", {
        startDate: Date.parse("2025-12-01T00:00:00.000Z"),
        endDate: Date.parse("2025-12-15T00:00:00.000Z"),
      }),
    ];

    const featured = pickFeaturedPublicExhibition(exhibitions, now);

    expect(featured?.id).toBe("past-recent");
  });

  it("전시가 없으면 null을 반환한다", () => {
    expect(pickFeaturedPublicExhibition([], Date.parse("2026-02-17T00:00:00.000Z"))).toBeNull();
  });
});
