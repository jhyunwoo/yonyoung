import { describe, expect, it } from "vitest";

import {
  formatKoreanDate,
  formatKoreanDateCompact,
  formatKoreanDateRange,
  formatKoreanYearRange,
} from "@/shared/utils/date-formatters";

const start = new Date("2025-03-01T12:00:00+09:00").getTime();
const end = new Date("2026-03-01T12:00:00+09:00").getTime();

describe("shared/utils/date-formatters", () => {
  it("formats korean date outputs", () => {
    const formatted = formatKoreanDate(start);
    expect(formatted).toContain("2025");

    const compact = formatKoreanDateCompact(start);
    expect(compact).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("builds date and year ranges", () => {
    const range = formatKoreanDateRange(start, end);
    expect(range).toContain(" - ");
    expect(range).toContain("2025");
    expect(range).toContain("2026");

    expect(formatKoreanYearRange(start, end)).toBe("2025년 - 2026년");
  });

  it("하루짜리 일정은 범위 대신 날짜 하나로 쓴다", () => {
    const morning = new Date("2026-09-30T09:00:00+09:00").getTime();
    const evening = new Date("2026-09-30T21:00:00+09:00").getTime();
    expect(formatKoreanDateRange(morning, evening)).toBe(formatKoreanDate(morning));
    expect(formatKoreanDateRange(morning, evening)).not.toContain(" - ");
  });
});
