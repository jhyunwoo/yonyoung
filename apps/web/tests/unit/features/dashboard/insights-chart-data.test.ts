import { describe, expect, it } from "vitest";
import {
  bucketToDate,
  metricValue,
  toHourlyColumns,
  toPathSankey,
  toReferrerSankey,
  uncollectedRange,
} from "@/features/dashboard/stats/insights-chart-data";

const point = {
  bucket: "2026-10-01",
  views: 10,
  visitors: 4,
  sessions: 5,
  avgSessionMs: 60_000,
  newVisitors: 3,
  returningVisitors: 1,
  prevViews: 8,
  prevVisitors: 3,
  prevSessions: 4,
  prevAvgSessionMs: 30_000,
  collected: true,
};

describe("insights-chart-data", () => {
  it("버킷 문자열을 KST 자정 Date로 바꾼다", () => {
    expect(bucketToDate("2026-10-01").toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
    expect(bucketToDate("2026-10").toISOString()).toBe(
      "2026-09-30T15:00:00.000Z",
    );
  });

  it("지표별 현재·이전 값을 고른다. 체류는 초 단위다", () => {
    expect(metricValue(point, "views")).toEqual({ current: 10, previous: 8 });
    expect(metricValue(point, "duration")).toEqual({
      current: 60,
      previous: 30,
    });
  });

  it("요일×시간 168칸을 24열 7행으로 만든다", () => {
    const hourly = Array.from({ length: 168 }, (_, i) => ({
      weekday: Math.floor(i / 24),
      hour: i % 24,
      views: i,
    }));
    const columns = toHourlyColumns(hourly);
    expect(columns).toHaveLength(24);
    expect(columns[8]!.bins).toHaveLength(7);
    expect(columns[8]!.bins[2]!.count).toBe(2 * 24 + 8);
  });

  it("유입 흐름 Sankey는 유입 노드 다음에 페이지 종류 노드를 둔다", () => {
    const data = toReferrerSankey([
      { referrer: "google.com", landing: "home", sessions: 3 },
      { referrer: "direct", landing: "activity", sessions: 2 },
    ]);
    expect(data.nodes.map((node) => node.name)).toEqual([
      "google.com",
      "직접 접속",
      "홈",
      "활동",
    ]);
    expect(data.links).toEqual([
      { source: 0, target: 2, value: 3 },
      { source: 1, target: 3, value: 2 },
    ]);
  });

  it("이동 경로 Sankey는 단계별로 노드를 나누고 이탈을 따로 둔다", () => {
    const data = toPathSankey([
      { step: 1, from: "home", to: "activity", sessions: 2 },
      { step: 1, from: "home", to: "exit", sessions: 1 },
      { step: 2, from: "activity", to: "exit", sessions: 2 },
    ]);
    expect(data.nodes.map((node) => node.name)).toEqual([
      "진입: 홈",
      "2번째: 활동",
      "2번째: 이탈",
      "3번째: 이탈",
    ]);
    expect(data.links).toEqual([
      { source: 0, target: 1, value: 2 },
      { source: 0, target: 2, value: 1 },
      { source: 1, target: 3, value: 2 },
    ]);
  });

  it("수집 전 구간의 처음과 끝을 돌려준다", () => {
    expect(
      uncollectedRange([
        { ...point, bucket: "2026-10-01", collected: false },
        { ...point, bucket: "2026-10-02", collected: false },
        { ...point, bucket: "2026-10-03", collected: true },
      ]),
    ).toEqual({
      from: bucketToDate("2026-10-01"),
      to: bucketToDate("2026-10-02"),
    });
    expect(uncollectedRange([point])).toBeNull();
  });
});
