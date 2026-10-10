import { describe, expect, it } from "vitest";
import {
  autoGranularity,
  bucketSeries,
  fillDailySeries,
  resolveAnalyticsRange,
  summarizeSeries,
  weekdayAverages,
} from "../features/page-views/page-view-analytics";
import {
  classifyDevice,
  normalizeReferrerHost,
} from "../lib/views/page-view-target";
import { AppError } from "../shared/errors/AppError";

// 2026-10-10 01:00 KST (2026-10-09 16:00 UTC). UTC 날짜와 KST 날짜가 다른 시각을 일부러 고른다.
const NOW = Date.parse("2026-10-09T16:00:00.000Z");

const series = (from: string, counts: number[]) =>
  counts.map((count, index) => {
    const date = new Date(Date.parse(`${from}T00:00:00Z`) + index * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { date, count };
  });

describe("resolveAnalyticsRange", () => {
  it("기본값은 KST 오늘까지 최근 30일이고 직전 30일을 비교 기간으로 잡는다", () => {
    expect(resolveAnalyticsRange({}, NOW)).toEqual({
      from: "2026-09-11",
      to: "2026-10-10",
      days: 30,
      granularity: "day",
      previous: { from: "2026-08-12", to: "2026-09-10" },
    });
  });

  it("미래 종료일은 오늘로 맞춘다", () => {
    const range = resolveAnalyticsRange({ from: "2026-10-01", to: "2027-01-01" }, NOW);
    expect(range.to).toBe("2026-10-10");
    expect(range.days).toBe(10);
  });

  it("기간 길이에 맞춰 집계 단위를 고르고, 지정값이 있으면 따른다", () => {
    expect(resolveAnalyticsRange({ from: "2026-04-12" }, NOW).granularity).toBe("week");
    expect(resolveAnalyticsRange({ from: "2025-10-11" }, NOW).granularity).toBe("month");
    expect(
      resolveAnalyticsRange({ from: "2025-10-11", granularity: "day" }, NOW).granularity,
    ).toBe("day");
  });

  it.each([
    [{ from: "2026-10-05", to: "2026-10-01" }, "시작일은 종료일보다 늦을 수 없습니다."],
    [{ from: "2024-01-01", to: "2026-01-01" }, "조회 기간은 최대 731일입니다."],
    [{ from: "2026-02-30" }, "from은 YYYY-MM-DD 형식의 실제 날짜여야 합니다."],
  ])("잘못된 기간 %o 은 400으로 거부한다", (query, message) => {
    expect(() => resolveAnalyticsRange(query, NOW)).toThrow(AppError);
    expect(() => resolveAnalyticsRange(query, NOW)).toThrow(message);
  });
});

describe("autoGranularity", () => {
  it("경계값을 포함한다", () => {
    expect(autoGranularity(31)).toBe("day");
    expect(autoGranularity(32)).toBe("week");
    expect(autoGranularity(183)).toBe("week");
    expect(autoGranularity(184)).toBe("month");
  });
});

describe("fillDailySeries", () => {
  it("기록이 없는 날을 0으로 채우고 범위 밖 행은 버린다", () => {
    expect(
      fillDailySeries(
        [
          { date: "2026-09-30", count: 9 },
          { date: "2026-10-02", count: 4 },
        ],
        "2026-10-01",
        "2026-10-03",
      ),
    ).toEqual([
      { date: "2026-10-01", count: 0 },
      { date: "2026-10-02", count: 4 },
      { date: "2026-10-03", count: 0 },
    ]);
  });
});

describe("bucketSeries", () => {
  it("일 단위는 이전 기간을 같은 순번의 날과 짝짓는다", () => {
    expect(
      bucketSeries(series("2026-10-01", [1, 2]), series("2026-09-29", [5, 6]), "day"),
    ).toEqual([
      { bucket: "2026-10-01", views: 1, prevViews: 5 },
      { bucket: "2026-10-02", views: 2, prevViews: 6 },
    ]);
  });

  it("주 단위는 월요일에 끊고, 잘린 첫 주는 기간 첫날을 라벨로 쓴다", () => {
    // 2026-10-01은 목요일, 2026-10-05는 월요일이다.
    const current = series("2026-10-01", [1, 1, 1, 1, 2, 2]);
    const previous = series("2026-09-25", [3, 3, 3, 3, 4, 4]);
    expect(bucketSeries(current, previous, "week")).toEqual([
      { bucket: "2026-10-01", views: 4, prevViews: 12 },
      { bucket: "2026-10-05", views: 4, prevViews: 8 },
    ]);
  });

  it("월 단위는 YYYY-MM으로 묶는다", () => {
    const current = series("2026-09-29", [1, 2, 3, 4]);
    expect(bucketSeries(current, [], "month")).toEqual([
      { bucket: "2026-09", views: 3, prevViews: 0 },
      { bucket: "2026-10", views: 7, prevViews: 0 },
    ]);
  });
});

describe("weekdayAverages", () => {
  it("월요일을 0으로 요일별 일평균을 낸다", () => {
    // 2026-10-05(월)부터 2주
    const result = weekdayAverages(
      series("2026-10-05", [2, 0, 0, 0, 0, 0, 7, 3, 0, 0, 0, 0, 0, 0]),
    );
    expect(result[0]).toEqual({ weekday: 0, averageViews: 2.5 });
    expect(result[6]).toEqual({ weekday: 6, averageViews: 3.5 });
    expect(result).toHaveLength(7);
  });
});

describe("summarizeSeries", () => {
  it("합계, 일평균, 최고 조회일을 낸다", () => {
    expect(summarizeSeries(series("2026-10-01", [1, 5, 3]))).toEqual({
      total: 9,
      dailyAverage: 3,
      peak: { date: "2026-10-02", count: 5 },
    });
  });

  it("조회가 없으면 최고 조회일은 null이다", () => {
    expect(summarizeSeries(series("2026-10-01", [0, 0])).peak).toBeNull();
  });
});

describe("normalizeReferrerHost", () => {
  it.each([
    [undefined, "direct"],
    ["", "direct"],
    ["WWW.Instagram.com", "instagram.com"],
    ["m.search.naver.com", "search.naver.com"],
    ["localhost", "other"],
    ["evil.com/<script>", "other"],
    [`${"a".repeat(250)}.com`, "other"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeReferrerHost(raw)).toBe(expected);
  });
});

describe("classifyDevice", () => {
  it.each([
    [undefined, "desktop"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "desktop"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148", "mobile"],
    ["Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36", "mobile"],
    ["Mozilla/5.0 (Linux; Android 15; SM-X910) Safari/537.36", "tablet"],
    ["Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", "tablet"],
  ])("%s → %s", (userAgent, expected) => {
    expect(classifyDevice(userAgent)).toBe(expected);
  });
});
