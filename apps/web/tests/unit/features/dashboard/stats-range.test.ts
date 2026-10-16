import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  kstToday,
  parseStatsSearchParams,
  presetQuery,
  toInsightsApiSearch,
  toStatsSearch,
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
      filters: DEFAULT_FILTERS,
      metric: "views",
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
      filters: DEFAULT_FILTERS,
      metric: "views",
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
      filters: DEFAULT_FILTERS,
      metric: "views",
    } as const;
    expect(toStatsSearch(custom)).toBe("from=2026-01-01&to=2026-01-31");
    expect(toInsightsApiSearch(presetQuery("7d", TODAY))).toBe(
      "from=2026-10-04&to=2026-10-10",
    );
  });

  it("URL로 만든 쿼리를 다시 파싱하면 같은 쿼리가 된다", () => {
    const query = { ...presetQuery("6m", TODAY), granularity: "month" as const };
    const params = Object.fromEntries(new URLSearchParams(toStatsSearch(query)));
    expect(parseStatsSearchParams(params, TODAY)).toEqual(query);
  });
});

describe("조회 옵션 필터", () => {
  const today = "2026-10-16";

  it("필터와 지표를 URL에서 읽는다", () => {
    const query = parseStatsSearchParams(
      {
        audience: "member",
        device: "mobile",
        referrer: "google.com",
        landing: "activity",
        metric: "duration",
      },
      today,
    );
    expect(query.filters).toEqual({
      audience: "member",
      device: "mobile",
      referrer: "google.com",
      landing: "activity",
    });
    expect(query.metric).toBe("duration");
  });

  it("잘못된 값은 기본값으로 돌린다", () => {
    const query = parseStatsSearchParams(
      {
        audience: "robots",
        device: "fridge",
        referrer: "https://evil/path",
        landing: "admin",
        metric: "money",
      },
      today,
    );
    expect(query.filters).toEqual(DEFAULT_FILTERS);
    expect(query.metric).toBe("views");
  });

  it("기본값이 아닌 필터만 URL에 남기고 왕복해도 같다", () => {
    const query = {
      ...presetQuery("30d", today),
      filters: {
        ...DEFAULT_FILTERS,
        audience: "external" as const,
        referrer: "direct",
      },
      metric: "visitors" as const,
    };
    const search = toStatsSearch(query);
    expect(search).toBe("audience=external&referrer=direct&metric=visitors");
    expect(
      parseStatsSearchParams(Object.fromEntries(new URLSearchParams(search)), today),
    ).toEqual(query);
  });

  it("API 요청에는 지표를 빼고 필터만 보낸다", () => {
    const query = {
      ...presetQuery("7d", today),
      filters: { ...DEFAULT_FILTERS, landing: "exhibition" as const },
      metric: "sessions" as const,
    };
    expect(toInsightsApiSearch(query)).toBe(
      "from=2026-10-10&to=2026-10-16&landing=exhibition",
    );
  });

  it("켜진 필터 수를 센다", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_FILTERS,
        device: "tablet",
        referrer: "direct",
      }),
    ).toBe(2);
  });
});
