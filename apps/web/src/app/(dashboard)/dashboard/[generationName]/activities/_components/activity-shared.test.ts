import { describe, expect, it } from "vitest";
import {
  buildActivityImageSortPayload,
  formatTimestampToDateInput,
  parseDateInputToTimestamp,
  validateActivityDateRange,
} from "./activity-shared";

describe("activity-shared helpers", () => {
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

  it("validateActivityDateRange는 시작일/종료일 역전을 차단한다", () => {
    const result = validateActivityDateRange({
      startDateInput: "2030-03-03",
      endDateInput: "2030-03-01",
    });

    expect("errorMessage" in result).toBe(true);
    if ("errorMessage" in result) {
      expect(result.errorMessage).toContain("종료일");
    }
  });

  it("buildActivityImageSortPayload는 음수/소수를 정규화하고 정렬한다", () => {
    const payload = buildActivityImageSortPayload([
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
});
