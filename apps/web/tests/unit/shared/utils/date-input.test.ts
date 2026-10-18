import { describe, expect, it } from "vitest";

import {
  formatTimestampToDateInput,
  parseDateInputToTimestamp,
  sortByStartDateDesc,
  validateDateRange,
} from "@/shared/utils/date-input";

describe("date-input", () => {
  it("date input 값과 타임스탬프를 오간다", () => {
    const date = parseDateInputToTimestamp("2025-03-01");
    expect(date).toBe(new Date(2025, 2, 1).getTime());
    expect(formatTimestampToDateInput(date ?? 0)).toBe("2025-03-01");
    expect(parseDateInputToTimestamp(" 2026-01-31 ")).toBe(
      new Date(2026, 0, 31).getTime(),
    );
  });

  it("형식이 틀리거나 없는 날짜는 null이다", () => {
    expect(parseDateInputToTimestamp("2025-02-30")).toBeNull();
    expect(parseDateInputToTimestamp("2026-13-31")).toBeNull();
    expect(parseDateInputToTimestamp("2025/03/01")).toBeNull();
    expect(parseDateInputToTimestamp("")).toBeNull();
    expect(formatTimestampToDateInput(Number.NaN)).toBe("");
  });

  it("기간을 검사하고 오류 문구 앞에 대상 이름을 붙인다", () => {
    expect(
      validateDateRange(
        { startDateInput: "2025-03-01", endDateInput: "2025-03-05" },
        "활동",
      ),
    ).toEqual({
      startDate: new Date(2025, 2, 1).getTime(),
      endDate: new Date(2025, 2, 5).getTime(),
    });
    expect(
      validateDateRange(
        { startDateInput: "2025-03-10", endDateInput: "2025-03-05" },
        "활동",
      ),
    ).toEqual({ errorMessage: "활동 종료일은 시작일보다 빠를 수 없습니다." });
    expect(
      validateDateRange(
        { startDateInput: "2026-01-10", endDateInput: "2026-01-05" },
        "전시",
      ),
    ).toEqual({ errorMessage: "전시 종료일은 시작일보다 빠를 수 없습니다." });
    expect(
      validateDateRange({ startDateInput: "", endDateInput: "2026-01-05" }, "전시"),
    ).toEqual({ errorMessage: "전시 시작일과 종료일을 올바르게 입력해 주세요." });
  });

  it("시작일이 늦은 것부터 정렬하고 원본은 그대로 둔다", () => {
    const list = [
      { id: "a", startDate: 1 },
      { id: "b", startDate: 2 },
    ];
    expect(sortByStartDateDesc(list).map((item) => item.id)).toEqual(["b", "a"]);
    expect(list.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
