import { describe, expect, it } from "vitest";
import {
  formatKoreanDate,
  formatKoreanDateCompact,
  formatKoreanDateRange,
  formatKoreanYearRange,
} from "./date-formatters";

describe("date-formatters", () => {
  const start = Date.parse("2026-02-01T00:00:00.000Z");
  const end = Date.parse("2027-03-01T00:00:00.000Z");

  it("한국어 날짜 포맷 문자열을 반환한다", () => {
    expect(formatKoreanDate(start).length).toBeGreaterThan(0);
  });

  it("compact 포맷은 공백이 제거된 yyyy.mm.dd 형태를 반환한다", () => {
    expect(formatKoreanDateCompact(start)).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it("날짜 범위를 하이픈으로 연결한다", () => {
    expect(formatKoreanDateRange(start, end)).toContain(" - ");
  });

  it("연도 범위를 하이픈으로 연결한다", () => {
    expect(formatKoreanYearRange(start, end)).toContain(" - ");
  });
});
