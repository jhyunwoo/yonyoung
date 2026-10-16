import { describe, expect, it } from "vitest";
import {
  computeVisitorInsights,
  type VisitorInsightsInput,
} from "../features/page-views/visitor-insights";
import type {
  AnalyticsEventRow,
  InsightsSegment,
  PageViewAnalyticsRange,
} from "../lib/services/types";

const RANGE: PageViewAnalyticsRange = {
  from: "2026-10-01",
  to: "2026-10-07",
  days: 7,
  granularity: "day",
  previous: { from: "2026-09-24", to: "2026-09-30" },
};
const ALL: InsightsSegment = {
  audience: "all",
  device: "all",
  referrer: "all",
  landing: "all",
};

/** "2026-10-01T10:00" 같은 KST 시각을 epoch ms로 */
const at = (kst: string) => Date.parse(`${kst}:00+09:00`);

let seq = 0;
const ev = (
  fields: Partial<AnalyticsEventRow> &
    Pick<AnalyticsEventRow, "sessionId" | "visitedAt">,
): AnalyticsEventRow => ({
  id: `e${++seq}`,
  visitorId: "v1",
  pageType: "home",
  resourceId: "home",
  referrerHost: null,
  device: "desktop",
  isMember: false,
  engagedMs: null,
  ...fields,
});

const run = (
  events: AnalyticsEventRow[],
  extra: Partial<VisitorInsightsInput> = {},
) =>
  computeVisitorInsights({
    range: RANGE,
    segment: ALL,
    events,
    firstSeen: new Map(),
    trackedSinceMs: at("2026-09-01T00:00"),
    legacy: null,
    ...extra,
  });

const BASIC = () => [
  ev({
    sessionId: "s1",
    visitedAt: at("2026-10-01T10:00"),
    referrerHost: "google.com",
    engagedMs: 5_000,
  }),
  ev({
    sessionId: "s1",
    visitedAt: at("2026-10-01T10:02"),
    pageType: "activity",
    resourceId: "a1",
    engagedMs: 20_000,
  }),
  ev({
    sessionId: "s2",
    visitorId: "v2",
    visitedAt: at("2026-10-02T12:00"),
    pageType: "exhibition",
    resourceId: "x1",
    referrerHost: "direct",
    device: "mobile",
  }),
  ev({
    sessionId: "s3",
    visitedAt: at("2026-10-03T09:00"),
    referrerHost: "direct",
    engagedMs: 40_000,
    isMember: true,
  }),
];

describe("computeVisitorInsights", () => {
  it("세션 지표를 계산하고 체류 미측정 세션은 평균에서 뺀다", () => {
    const { summary } = run(BASIC());
    expect(summary).toMatchObject({
      views: 4,
      visitors: 2,
      sessions: 3,
      pagesPerSession: 1.3,
      avgSessionMs: 32_500,
      unmeasuredSessions: 1,
      bounceRate: 0.6667,
    });
  });

  it("세그먼트는 세션 단위로 거른다", () => {
    expect(
      run(BASIC(), { segment: { ...ALL, audience: "member" } }).summary
        .sessions,
    ).toBe(1);
    expect(
      run(BASIC(), { segment: { ...ALL, audience: "external" } }).summary
        .sessions,
    ).toBe(2);
    expect(
      run(BASIC(), { segment: { ...ALL, landing: "exhibition" } }).summary
        .sessions,
    ).toBe(1);
    expect(
      run(BASIC(), { segment: { ...ALL, device: "mobile" } }).summary.sessions,
    ).toBe(1);
    // 활동 페이지는 s1 의 두 번째 페이지라 진입 페이지 필터에 걸리지 않는다.
    expect(
      run(BASIC(), { segment: { ...ALL, landing: "activity" } }).summary
        .sessions,
    ).toBe(0);
    const google = run(BASIC(), {
      segment: { ...ALL, referrer: "google.com" },
    });
    expect(google.summary).toMatchObject({ sessions: 1, views: 2 });
  });

  it("기간 전 첫 방문이면 재방문, 기간 안이면 신규다", () => {
    const { summary } = run(BASIC(), {
      firstSeen: new Map([
        ["v1", at("2026-09-20T00:00")],
        ["v2", at("2026-10-02T12:00")],
      ]),
    });
    expect(summary).toMatchObject({ newVisitors: 1, returningVisitors: 1 });
  });

  it("주 단위 추이는 기간 첫날을 첫 버킷 라벨로 쓰고 이전 기간을 같은 순번 날짜에 맞춘다", () => {
    const range: PageViewAnalyticsRange = {
      from: "2026-10-01",
      to: "2026-10-14",
      days: 14,
      granularity: "week",
      previous: { from: "2026-09-17", to: "2026-09-30" },
    };
    const result = run(
      [
        ev({ sessionId: "c1", visitedAt: at("2026-10-02T10:00") }),
        ev({ sessionId: "c2", visitedAt: at("2026-10-06T10:00") }),
        ev({ sessionId: "p1", visitedAt: at("2026-09-17T10:00") }),
        ev({ sessionId: "p2", visitedAt: at("2026-09-22T10:00") }),
      ],
      { range, trackedSinceMs: at("2026-10-06T00:00") },
    );
    expect(result.trend).toEqual([
      expect.objectContaining({
        bucket: "2026-10-01",
        sessions: 1,
        prevSessions: 1,
        collected: false,
      }),
      expect.objectContaining({
        bucket: "2026-10-05",
        sessions: 1,
        prevSessions: 1,
        collected: true,
      }),
      expect.objectContaining({
        bucket: "2026-10-12",
        sessions: 0,
        prevSessions: 0,
        collected: true,
      }),
    ]);
  });

  it("필터가 없으면 페이지뷰를 기존 합계에서 가져온다", () => {
    const current = ["01", "02", "03", "04", "05", "06", "07"].map((d, i) => ({
      date: `2026-10-${d}`,
      count: i + 1,
    }));
    const previous = ["24", "25", "26", "27", "28", "29", "30"].map((d) => ({
      date: `2026-09-${d}`,
      count: 2,
    }));
    const result = run(BASIC(), { legacy: { current, previous } });
    expect(result.summary.views).toBe(28);
    expect(result.summary.prev.views).toBe(14);
    expect(result.trend[0]).toMatchObject({
      views: 1,
      prevViews: 2,
      sessions: 1,
    });
  });

  it("요일·시간은 KST 기준이다", () => {
    const { hourly } = run([
      ev({ sessionId: "h1", visitedAt: at("2026-10-05T08:30") }),
      ev({ sessionId: "h2", visitedAt: at("2026-10-04T23:59") }),
    ]);
    expect(hourly).toHaveLength(168);
    expect(hourly[8]).toEqual({ weekday: 0, hour: 8, views: 1 });
    expect(hourly[167]).toEqual({ weekday: 6, hour: 23, views: 1 });
  });

  it("유입 흐름은 상위 6개 밖을 other로 접는다", () => {
    const hosts: Array<[string, number]> = [
      ["a.com", 7],
      ["b.com", 6],
      ["c.com", 5],
      ["d.com", 4],
      ["e.com", 3],
      ["f.com", 2],
      ["g.com", 1],
    ];
    const events = hosts.flatMap(([host, count]) =>
      Array.from({ length: count }, (_, i) =>
        ev({
          sessionId: `${host}-${i}`,
          visitorId: `${host}-${i}`,
          visitedAt: at("2026-10-01T10:00"),
          referrerHost: host,
        }),
      ),
    );
    const { referrerFlow, referrerOptions } = run(events);
    expect(referrerFlow).toContainEqual({
      referrer: "other",
      landing: "home",
      sessions: 1,
    });
    expect(referrerFlow.some((row) => row.referrer === "g.com")).toBe(false);
    expect(referrerOptions[0]).toBe("a.com");
    expect(referrerOptions).toContain("g.com");
  });

  it("이동 경로는 1·2단계와 이탈을 센다", () => {
    const { pathFlow } = run([
      ev({ sessionId: "p", visitedAt: at("2026-10-01T10:00") }),
      ev({
        sessionId: "p",
        visitedAt: at("2026-10-01T10:01"),
        pageType: "activity",
        resourceId: "a1",
      }),
      ev({
        sessionId: "p",
        visitedAt: at("2026-10-01T10:02"),
        pageType: "exhibition",
        resourceId: "x1",
      }),
      ev({
        sessionId: "q",
        visitorId: "v2",
        visitedAt: at("2026-10-01T11:00"),
      }),
    ]);
    expect(pathFlow).toEqual(
      expect.arrayContaining([
        { step: 1, from: "home", to: "activity", sessions: 1 },
        { step: 1, from: "home", to: "exit", sessions: 1 },
        { step: 2, from: "activity", to: "exhibition", sessions: 1 },
      ]),
    );
    expect(pathFlow).toHaveLength(3);
  });

  it("콘텐츠별 조회·방문자·체류·진입·이탈을 모은다", () => {
    const { content } = run([
      ev({
        sessionId: "a",
        visitedAt: at("2026-10-01T10:00"),
        engagedMs: 1_000,
      }),
      ev({
        sessionId: "a",
        visitedAt: at("2026-10-01T10:01"),
        pageType: "activity",
        resourceId: "a1",
      }),
      ev({
        sessionId: "b",
        visitorId: "v2",
        visitedAt: at("2026-10-01T11:00"),
        pageType: "activity",
        resourceId: "a1",
        engagedMs: 3_000,
      }),
    ]);
    expect(content).toEqual([
      {
        pageType: "activity",
        resourceId: "a1",
        views: 2,
        visitors: 2,
        avgEngagedMs: 3_000,
        entries: 1,
        bounceRate: 1,
      },
      {
        pageType: "home",
        resourceId: "home",
        views: 1,
        visitors: 1,
        avgEngagedMs: 1_000,
        entries: 1,
        bounceRate: 0,
      },
    ]);
  });

  it("세션 깊이와 체류 분포 구간을 채운다", () => {
    const deep = Array.from({ length: 6 }, (_, i) =>
      ev({
        sessionId: "deep",
        visitorId: "v3",
        visitedAt: at("2026-10-02T10:00") + i * 1000,
      }),
    );
    const { depth, duration } = run([
      ev({
        sessionId: "one",
        visitedAt: at("2026-10-01T10:00"),
        engagedMs: 5_000,
      }),
      ev({
        sessionId: "two",
        visitorId: "v2",
        visitedAt: at("2026-10-01T11:00"),
        engagedMs: 20_000,
      }),
      ev({
        sessionId: "two",
        visitorId: "v2",
        visitedAt: at("2026-10-01T11:01"),
        engagedMs: 20_000,
      }),
      ...deep,
    ]);
    expect(depth).toEqual([
      { bucket: "1", sessions: 1 },
      { bucket: "2", sessions: 1 },
      { bucket: "3", sessions: 0 },
      { bucket: "4", sessions: 0 },
      { bucket: "5+", sessions: 1 },
    ]);
    expect(duration).toEqual([
      { bucket: "<10s", sessions: 1 },
      { bucket: "10-30s", sessions: 0 },
      { bucket: "30s-1m", sessions: 1 },
      { bucket: "1-3m", sessions: 0 },
      { bucket: "3-10m", sessions: 0 },
      { bucket: "10m+", sessions: 0 },
    ]);
  });

  it("주별 코호트는 기간 끝을 넘는 칸을 null로 둔다", () => {
    const range: PageViewAnalyticsRange = {
      from: "2026-10-01",
      to: "2026-10-21",
      days: 21,
      granularity: "week",
      previous: { from: "2026-09-10", to: "2026-09-30" },
    };
    const { cohorts } = run(
      [
        ev({ sessionId: "c1", visitedAt: at("2026-10-01T10:00") }),
        ev({ sessionId: "c2", visitedAt: at("2026-10-06T10:00") }),
        ev({
          sessionId: "old",
          visitorId: "v2",
          visitedAt: at("2026-10-02T10:00"),
        }),
      ],
      {
        range,
        firstSeen: new Map([
          ["v1", at("2026-10-01T10:00")],
          ["v2", at("2026-08-01T10:00")],
        ]),
      },
    );
    expect(cohorts).toEqual([
      {
        week: "2026-09-28",
        size: 1,
        retention: [1, 0, 0, null, null, null, null, null],
      },
    ]);
  });

  it("이벤트가 없고 수집 전이면 모든 값이 비어 있다", () => {
    const result = run([], {
      trackedSinceMs: null,
      segment: { ...ALL, audience: "member" },
    });
    expect(result.summary).toMatchObject({
      views: 0,
      sessions: 0,
      bounceRate: 0,
      avgSessionMs: 0,
    });
    expect(result.segmented).toBe(true);
    expect(result.eventsTrackedSince).toBeNull();
    expect(result.trend).toHaveLength(7);
    expect(result.trend.every((point) => !point.collected)).toBe(true);
    expect(result.hourly.every((cell) => cell.views === 0)).toBe(true);
    expect(result.cohorts).toEqual([]);
    expect(result.content).toEqual([]);
    expect(result.referrerOptions).toEqual([]);
  });
});
