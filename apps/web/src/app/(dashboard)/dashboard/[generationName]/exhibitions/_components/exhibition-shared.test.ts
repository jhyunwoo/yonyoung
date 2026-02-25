import { describe, expect, it } from "vitest";
import {
  buildExhibitionImageMutationPlan,
  buildExhibitionImageSortPayload,
  formatTimestampToDateInput,
  hasMeaningfulExhibitionDescription,
  parseDateInputToTimestamp,
  summarizeExhibitionDescription,
  validateExhibitionDateRange,
} from "./exhibition-shared";

describe("exhibition-shared helpers", () => {
  it("formatTimestampToDateInput은 timestamp를 yyyy-mm-dd 형식으로 변환한다", () => {
    const date = new Date(2030, 2, 1).getTime();
    expect(formatTimestampToDateInput(date)).toBe("2030-03-01");
  });

  it("parseDateInputToTimestamp는 유효하지 않은 문자열에 null을 반환한다", () => {
    expect(parseDateInputToTimestamp("")).toBeNull();
    expect(parseDateInputToTimestamp("2030-13-01")).toBeNull();
    expect(parseDateInputToTimestamp("2030-02-31")).toBeNull();
    expect(parseDateInputToTimestamp("20300301")).toBeNull();
  });

  it("validateExhibitionDateRange는 시작일/종료일 역전을 차단한다", () => {
    const result = validateExhibitionDateRange({
      startDateInput: "2030-03-03",
      endDateInput: "2030-03-01",
    });

    expect("errorMessage" in result).toBe(true);
    if ("errorMessage" in result) {
      expect(result.errorMessage).toContain("종료일");
    }
  });

  it("buildExhibitionImageSortPayload는 음수/소수를 정규화하고 정렬한다", () => {
    const payload = buildExhibitionImageSortPayload([
      { id: "b", sortOrder: -3 },
      { id: "a", sortOrder: 1.4 },
      { id: "c", sortOrder: 1.6 },
    ]);

    expect(payload).toEqual([
      { imageId: "b", sortOrder: 0 },
      { imageId: "a", sortOrder: 1 },
      { imageId: "c", sortOrder: 2 },
    ]);
  });

  it("buildExhibitionImageMutationPlan은 삭제와 정렬 payload를 동시에 계산한다", () => {
    const plan = buildExhibitionImageMutationPlan({
      existingImages: [
        { id: "existing-1", sortOrder: 4 },
        { id: "existing-2", sortOrder: 0 },
      ],
      deletedImageIds: ["existing-1"],
      createdImages: [{ id: "new-1", sortOrder: 5 }],
    });

    expect(plan.deleteImageIds).toEqual(["existing-1"]);
    expect(plan.sortPayload).toEqual([
      { imageId: "existing-2", sortOrder: 0 },
      { imageId: "new-1", sortOrder: 5 },
    ]);
  });

  it("hasMeaningfulExhibitionDescription은 태그만 있는 본문을 빈 값으로 판정한다", () => {
    expect(hasMeaningfulExhibitionDescription("<p><br></p>")).toBe(false);
    expect(hasMeaningfulExhibitionDescription("<h2>전시</h2><p>설명</p>")).toBe(true);
  });

  it("summarizeExhibitionDescription은 HTML 제거 후 최대 길이로 요약한다", () => {
    const summary = summarizeExhibitionDescription("<p>12345678901234567890</p>", 10);
    expect(summary).toBe("1234567890...");
  });
});
