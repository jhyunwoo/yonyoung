import type { ApiVisitorInsights } from "@yonyoung/contracts";
import type { StatsMetric } from "./stats-range";
import { PAGE_TYPE_LABEL, referrerLabel } from "./insights-format";

type TrendPoint = ApiVisitorInsights["trend"][number];

export type SankeyData = {
  nodes: Array<{ name: string; category?: "source" }>;
  links: Array<{ source: number; target: number; value: number }>;
};

/**
 * 버킷은 KST 날짜(YYYY-MM-DD) 또는 월(YYYY-MM)이다. 차트는 Date를 브라우저 시간대로 포맷하므로
 * 로컬 자정으로 만들어야 어느 시간대에서 보든 버킷과 같은 날짜가 찍힌다.
 */
export const bucketToDate = (bucket: string): Date => {
  const [year, month, day = 1] = bucket.split("-").map(Number);
  return new Date(year!, month! - 1, day);
};

export const metricValue = (point: TrendPoint, metric: StatsMetric) => {
  switch (metric) {
    case "views":
      return { current: point.views, previous: point.prevViews };
    case "visitors":
      return { current: point.visitors, previous: point.prevVisitors };
    case "sessions":
      return { current: point.sessions, previous: point.prevSessions };
    case "duration":
      return {
        current: Math.round(point.avgSessionMs / 1000),
        previous: Math.round(point.prevAvgSessionMs / 1000),
      };
  }
};

// bklit 히트맵은 날짜 격자용이라 칸마다 Date가 필요하다. 2024-01-01(월)부터의 고정 주를 써서 요일 순서만 맞춘다.
const REFERENCE_MONDAY_UTC = Date.UTC(2024, 0, 1);

export const toHourlyColumns = (hourly: ApiVisitorInsights["hourly"]) =>
  Array.from({ length: 24 }, (_, hour) => ({
    bin: hour,
    bins: Array.from({ length: 7 }, (_, weekday) => ({
      bin: weekday,
      count:
        hourly.find((cell) => cell.weekday === weekday && cell.hour === hour)?.views ?? 0,
      date: new Date(REFERENCE_MONDAY_UTC + (weekday * 24 + hour) * 3_600_000),
    })),
  }));

const buildSankey = (
  links: Array<{ from: string; to: string; value: number }>,
): SankeyData => {
  const index = new Map<string, number>();
  const nodeOf = (name: string) => {
    if (!index.has(name)) index.set(name, index.size);
    return index.get(name)!;
  };
  // 출발 노드를 먼저 등록해 왼쪽 열이 앞번호를 갖게 한다.
  links.forEach((link) => nodeOf(link.from));
  const sankeyLinks = links.map((link) => ({
    source: nodeOf(link.from),
    target: nodeOf(link.to),
    value: link.value,
  }));
  const targets = new Set(sankeyLinks.map((link) => link.target));
  return {
    // bklit 노드는 source일 때만 나가는 흐름을 합쳐 값으로 보여 준다.
    nodes: [...index.keys()].map((name, nodeIndex) =>
      targets.has(nodeIndex) ? { name } : { name, category: "source" as const },
    ),
    links: sankeyLinks,
  };
};

export const toReferrerSankey = (rows: ApiVisitorInsights["referrerFlow"]): SankeyData =>
  buildSankey(
    rows.map((row) => ({
      from: referrerLabel(row.referrer),
      to: PAGE_TYPE_LABEL[row.landing],
      value: row.sessions,
    })),
  );

const STEP_LABEL = { 1: "진입", 2: "2번째", 3: "3번째" } as const;
const pageLabel = (page: keyof typeof PAGE_TYPE_LABEL | "exit") =>
  page === "exit" ? "이탈" : PAGE_TYPE_LABEL[page];

export const toPathSankey = (rows: ApiVisitorInsights["pathFlow"]): SankeyData =>
  buildSankey(
    [...rows]
      .sort((a, b) => a.step - b.step)
      .map((row) => ({
        from: `${STEP_LABEL[row.step]}: ${pageLabel(row.from)}`,
        to: `${STEP_LABEL[(row.step + 1) as 2 | 3]}: ${pageLabel(row.to)}`,
        value: row.sessions,
      })),
  );

export const uncollectedRange = (trend: readonly TrendPoint[]) => {
  const pending = trend.filter((point) => !point.collected);
  if (pending.length === 0) return null;
  return {
    from: bucketToDate(pending[0]!.bucket),
    to: bucketToDate(pending[pending.length - 1]!.bucket),
  };
};
