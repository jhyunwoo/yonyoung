import { describe, expect, it } from "vitest";
import type { ApiPageViewAnalytics } from "@yonyoung/contracts";
import {
  kstToday,
  parseStatsSearchParams,
  presetQuery,
  toAnalyticsApiSearch,
  toStatsSearch,
  trendCsvFileName,
  trendToCsv,
  validateCustomRange,
} from "@/features/dashboard/stats/stats-range";

const TODAY = "2026-10-10";

describe("kstToday", () => {
  it("UTC로는 전날이어도 KST 날짜를 돌려준다", () => {
    expect(kstToday(Date.parse("2026-10-09T16:00:00.000Z"))).toBe("2026-10-10");
  });
});

describe("parseStatsSearchParams", () => {
  it("파라미터가 없으면 최근 30일 프리셋이다", () => {
    expect(parseStatsSearchParams({}, TODAY)).toEqual({
      preset: "30d",
      from: "2026-09-11",
      to: TODAY,
      granularity: null,
    });
  });

  it("프리셋은 오늘 기준 상대 기간으로 풀린다", () => {
    expect(parseStatsSearchParams({ range: "6m" }, TODAY)).toMatchObject({
      preset: "6m",
      from: "2026-04-12",
      to: TODAY,
    });
    expect(parseStatsSearchParams({ range: "1y" }, TODAY).from).toBe("2025-10-11");
  });

  it("유효한 from/to가 있으면 직접 지정 기간과 집계 단위를 쓴다", () => {
    expect(
      parseStatsSearchParams(
        { from: "2026-01-01", to: "2026-03-31", granularity: "month" },
        TODAY,
      ),
    ).toEqual({
      preset: "custom",
      from: "2026-01-01",
      to: "2026-03-31",
      granularity: "month",
    });
  });

  it.each([
    [{ from: "2026-03-01", to: "2026-01-01" }],
    [{ from: "2026-01-01", to: "2027-01-01" }],
    [{ from: "2023-01-01", to: "2026-01-01" }],
    [{ from: "2026-02-30", to: "2026-03-01" }],
    [{ range: "5y", granularity: "year" }],
  ])("잘못된 값 %o 은 기본값으로 돌아간다", (params) => {
    expect(parseStatsSearchParams(params, TODAY)).toMatchObject({
      preset: "30d",
      granularity: null,
    });
  });
});

describe("validateCustomRange", () => {
  it("문제를 사용자 문구로 알려 준다", () => {
    expect(validateCustomRange("", TODAY, TODAY)).toBe(
      "시작일과 종료일을 모두 입력해 주세요.",
    );
    expect(validateCustomRange("2026-10-01", "2026-10-11", TODAY)).toBe(
      "종료일은 오늘 이후로 정할 수 없습니다.",
    );
    expect(validateCustomRange("2026-10-05", "2026-10-01", TODAY)).toBe(
      "시작일은 종료일보다 늦을 수 없습니다.",
    );
    expect(validateCustomRange("2026-10-01", "2026-10-05", TODAY)).toBeNull();
  });
});

describe("URL 직렬화", () => {
  it("기본 프리셋은 빈 쿼리, 다른 프리셋은 range만 남긴다", () => {
    expect(toStatsSearch(presetQuery("30d", TODAY))).toBe("");
    expect(toStatsSearch({ ...presetQuery("1y", TODAY), granularity: "week" })).toBe(
      "range=1y&granularity=week",
    );
  });

  it("직접 지정은 날짜를, API 요청은 항상 절대 날짜를 보낸다", () => {
    const custom = {
      preset: "custom",
      from: "2026-01-01",
      to: "2026-01-31",
      granularity: null,
    } as const;
    expect(toStatsSearch(custom)).toBe("from=2026-01-01&to=2026-01-31");
    expect(toAnalyticsApiSearch(presetQuery("7d", TODAY))).toBe(
      "from=2026-10-04&to=2026-10-10",
    );
  });

  it("URL로 만든 쿼리를 다시 파싱하면 같은 쿼리가 된다", () => {
    const query = { ...presetQuery("6m", TODAY), granularity: "month" as const };
    const params = Object.fromEntries(new URLSearchParams(toStatsSearch(query)));
    expect(parseStatsSearchParams(params, TODAY)).toEqual(query);
  });
});

describe("trendToCsv", () => {
  const analytics = {
    range: { from: "2026-10-01", to: "2026-10-02", days: 2, granularity: "day" },
    previousRange: { from: "2026-09-29", to: "2026-09-30" },
    trend: [
      { bucket: "2026-10-01", views: 3, prevViews: 1 },
      { bucket: "2026-10-02", views: 0, prevViews: 4 },
    ],
  } as ApiPageViewAnalytics;

  it("BOM과 CRLF가 붙은 CSV를 만든다", () => {
    expect(trendToCsv(analytics)).toBe(
      "﻿구간,조회수,이전 기간 조회수 (2026-09-29~2026-09-30)\r\n" +
        "2026-10-01,3,1\r\n" +
        "2026-10-02,0,4\r\n",
    );
    expect(trendCsvFileName(analytics)).toBe("page-views_2026-10-01_2026-10-02_day.csv");
  });
});
