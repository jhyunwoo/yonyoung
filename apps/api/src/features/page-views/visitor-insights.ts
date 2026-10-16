import type {
  AnalyticsEventRow,
  DepthBucket,
  DurationBucket,
  InsightsCore,
  InsightsSegment,
  PageViewAnalyticsRange,
  VisitorInsightsEntity,
} from "../../lib/services/types";
import type {
  PageViewDevice,
  PageViewType,
} from "../../lib/views/page-view-target";
import {
  KST_OFFSET_MS,
  addDays,
  bucketKey,
  kstDateStartMs,
  mondayOf,
  toKstDate,
} from "./page-view-analytics";

type DailyPoint = { date: string; count: number };

export type VisitorInsightsInput = {
  range: PageViewAnalyticsRange;
  segment: InsightsSegment;
  /** 이전 기간 시작 ~ 조회 기간 끝의 이벤트 */
  events: readonly AnalyticsEventRow[];
  /** 조회 기간 방문자의 전체 기간 첫 이벤트 시각 */
  firstSeen: ReadonlyMap<string, number>;
  trackedSinceMs: number | null;
  /** 필터가 없을 때만 넘긴다. 기존 page_views 합계(빈 날 0 채움) */
  legacy: {
    current: readonly DailyPoint[];
    previous: readonly DailyPoint[];
  } | null;
};

type ContentRow = Omit<VisitorInsightsEntity["content"][number], "title">;
export type ComputedVisitorInsights = Omit<
  VisitorInsightsEntity,
  "content" | "truncated"
> & {
  content: ContentRow[];
};

type Session = {
  id: string;
  visitorId: string;
  events: AnalyticsEventRow[];
  start: number;
  isMember: boolean;
  device: PageViewDevice;
  referrer: string;
  landing: PageViewType;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const COHORT_WEEKS = 8;
const CONTENT_LIMIT = 50;
const REFERRER_FLOW_LIMIT = 6;
const REFERRER_OPTION_LIMIT = 10;
const DEPTH_BUCKETS: readonly DepthBucket[] = ["1", "2", "3", "4", "5+"];
const DURATION_BUCKETS: ReadonlyArray<{
  bucket: DurationBucket;
  underMs: number;
}> = [
  { bucket: "<10s", underMs: 10_000 },
  { bucket: "10-30s", underMs: 30_000 },
  { bucket: "30s-1m", underMs: 60_000 },
  { bucket: "1-3m", underMs: 180_000 },
  { bucket: "3-10m", underMs: 600_000 },
  { bucket: "10m+", underMs: Number.POSITIVE_INFINITY },
];

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const ratio = (part: number, whole: number) =>
  whole === 0 ? 0 : round(part / whole, 4);

export const isSegmented = (segment: InsightsSegment): boolean =>
  segment.audience !== "all" ||
  segment.device !== "all" ||
  segment.referrer !== "all" ||
  segment.landing !== "all";

const toSessions = (events: readonly AnalyticsEventRow[]): Session[] => {
  const grouped = new Map<string, AnalyticsEventRow[]>();
  for (const event of events) {
    const list = grouped.get(event.sessionId);
    if (list) list.push(event);
    else grouped.set(event.sessionId, [event]);
  }
  return [...grouped.entries()].map(([id, list]) => {
    list.sort((a, b) => a.visitedAt - b.visitedAt);
    const first = list[0]!;
    return {
      id,
      visitorId: first.visitorId,
      events: list,
      start: first.visitedAt,
      isMember: list.some((event) => event.isMember),
      device: first.device,
      // 첫 요청이 유실돼 유입 경로가 비면 직접 접속으로 본다.
      referrer: first.referrerHost ?? "direct",
      landing: first.pageType,
    };
  });
};

const matchesSegment = (session: Session, segment: InsightsSegment) =>
  (segment.audience === "all" ||
    (segment.audience === "member") === session.isMember) &&
  (segment.device === "all" || segment.device === session.device) &&
  (segment.referrer === "all" || segment.referrer === session.referrer) &&
  (segment.landing === "all" || segment.landing === session.landing);

const isMeasured = (session: Session) =>
  session.events.some((event) => event.engagedMs !== null);
const engagedMsOf = (session: Session) =>
  session.events.reduce((sum, event) => sum + (event.engagedMs ?? 0), 0);

const summarize = (
  sessions: readonly Session[],
): InsightsCore & { unmeasuredSessions: number } => {
  const views = sessions.reduce(
    (sum, session) => sum + session.events.length,
    0,
  );
  const measured = sessions.filter(isMeasured);
  const bounces = sessions.filter(
    (session) => session.events.length === 1,
  ).length;
  return {
    views,
    visitors: new Set(sessions.map((session) => session.visitorId)).size,
    sessions: sessions.length,
    pagesPerSession:
      sessions.length === 0 ? 0 : round(views / sessions.length, 1),
    avgSessionMs:
      measured.length === 0
        ? 0
        : Math.round(
            measured.reduce((sum, session) => sum + engagedMsOf(session), 0) /
              measured.length,
          ),
    bounceRate: ratio(bounces, sessions.length),
    unmeasuredSessions: sessions.length - measured.length,
  };
};

const countBy = <T>(items: readonly T[], keyOf: (item: T) => string) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const byCountDesc = (counts: Map<string, number>) =>
  [...counts.entries()].sort((a, b) => b[1] - a[1]);

const sum = (days: readonly DailyPoint[]) =>
  days.reduce((total, day) => total + day.count, 0);

export const computeVisitorInsights = (
  input: VisitorInsightsInput,
): ComputedVisitorInsights => {
  const { range, segment, legacy } = input;
  const currentStart = kstDateStartMs(range.from);
  const currentEnd = kstDateStartMs(addDays(range.to, 1));
  const previousStart = kstDateStartMs(range.previous.from);

  // 세션은 첫 이벤트 시각으로 기간에 귀속한다.
  const sessions = toSessions(input.events);
  const currentAll = sessions.filter(
    (s) => s.start >= currentStart && s.start < currentEnd,
  );
  const current = currentAll.filter((s) => matchesSegment(s, segment));
  const previous = sessions.filter(
    (s) =>
      s.start >= previousStart &&
      s.start < currentStart &&
      matchesSegment(s, segment),
  );
  // 첫 방문 기록이 없으면 이번이 첫 방문이다.
  const firstSeenOf = (visitorId: string) =>
    input.firstSeen.get(visitorId) ?? currentStart;
  const trackedSince =
    input.trackedSinceMs === null ? null : toKstDate(input.trackedSinceMs);

  // ── 추이 ──
  const dates: string[] = [];
  for (let date = range.from; date <= range.to; date = addDays(date, 1))
    dates.push(date);
  type Bucket = {
    label: string;
    lastDate: string;
    current: Session[];
    previous: Session[];
    legacyViews: number;
    legacyPrevViews: number;
  };
  const buckets = new Map<string, Bucket>();
  const keyOfDate = new Map<string, string>();
  for (const date of dates) {
    const key = bucketKey(date, range.granularity);
    const bucket = buckets.get(key) ?? {
      // 주 버킷 라벨은 기간 안 첫날이다. 첫 주가 잘려도 기간 밖 날짜가 보이지 않는다.
      label: range.granularity === "month" ? key : date,
      lastDate: date,
      current: [],
      previous: [],
      legacyViews: 0,
      legacyPrevViews: 0,
    };
    bucket.lastDate = date;
    buckets.set(key, bucket);
    keyOfDate.set(date, key);
  }
  const bucketOf = (date: string | undefined) =>
    date === undefined ? undefined : buckets.get(keyOfDate.get(date) ?? "");
  const dayOffset = (fromDate: string, ms: number) =>
    Math.round(
      (kstDateStartMs(toKstDate(ms)) - kstDateStartMs(fromDate)) / DAY_MS,
    );

  for (const session of current)
    bucketOf(toKstDate(session.start))?.current.push(session);
  // 이전 기간 i번째 날은 현재 기간 i번째 날과 같은 버킷에 넣는다.
  for (const session of previous) {
    bucketOf(
      dates[dayOffset(range.previous.from, session.start)],
    )?.previous.push(session);
  }
  if (legacy !== null) {
    dates.forEach((date, index) => {
      const bucket = bucketOf(date)!;
      bucket.legacyViews += legacy.current[index]?.count ?? 0;
      bucket.legacyPrevViews += legacy.previous[index]?.count ?? 0;
    });
  }

  const trend = [...buckets.entries()].map(([key, bucket]) => {
    const cur = summarize(bucket.current);
    const prev = summarize(bucket.previous);
    const visitorIds = new Set(bucket.current.map((s) => s.visitorId));
    const newVisitors = [...visitorIds].filter((visitorId) => {
      const first = firstSeenOf(visitorId);
      return first >= currentStart && keyOfDate.get(toKstDate(first)) === key;
    }).length;
    return {
      bucket: bucket.label,
      views: legacy !== null ? bucket.legacyViews : cur.views,
      visitors: cur.visitors,
      sessions: cur.sessions,
      avgSessionMs: cur.avgSessionMs,
      newVisitors,
      returningVisitors: visitorIds.size - newVisitors,
      prevViews: legacy !== null ? bucket.legacyPrevViews : prev.views,
      prevVisitors: prev.visitors,
      prevSessions: prev.sessions,
      prevAvgSessionMs: prev.avgSessionMs,
      collected: trackedSince !== null && bucket.lastDate >= trackedSince,
    };
  });

  // ── 요약 ──
  const currentSummary = summarize(current);
  const previousSummary = summarize(previous);
  const previousCore: InsightsCore = {
    views: previousSummary.views,
    visitors: previousSummary.visitors,
    sessions: previousSummary.sessions,
    pagesPerSession: previousSummary.pagesPerSession,
    avgSessionMs: previousSummary.avgSessionMs,
    bounceRate: previousSummary.bounceRate,
  };
  const visitorIds = new Set(current.map((s) => s.visitorId));
  const newVisitors = [...visitorIds].filter(
    (v) => firstSeenOf(v) >= currentStart,
  ).length;

  // ── 요일 × 시간 ──
  const hourly = Array.from({ length: 168 }, (_, index) => ({
    weekday: Math.floor(index / 24),
    hour: index % 24,
    views: 0,
  }));
  for (const session of current) {
    for (const event of session.events) {
      const kst = new Date(event.visitedAt + KST_OFFSET_MS);
      const weekday = (kst.getUTCDay() + 6) % 7;
      hourly[weekday * 24 + kst.getUTCHours()]!.views += 1;
    }
  }

  // ── 유입 → 진입 흐름 ──
  const topReferrers = new Set(
    byCountDesc(countBy(current, (s) => s.referrer))
      .filter(([host]) => host !== "other")
      .slice(0, REFERRER_FLOW_LIMIT)
      .map(([host]) => host),
  );
  const flows = new Map<
    string,
    { referrer: string; landing: PageViewType; sessions: number }
  >();
  for (const session of current) {
    const referrer = topReferrers.has(session.referrer)
      ? session.referrer
      : "other";
    const key = `${referrer}|${session.landing}`;
    const row = flows.get(key) ?? {
      referrer,
      landing: session.landing,
      sessions: 0,
    };
    row.sessions += 1;
    flows.set(key, row);
  }

  // ── 이동 경로 ──
  type PathRow = VisitorInsightsEntity["pathFlow"][number];
  const paths = new Map<string, PathRow>();
  const addPath = (
    step: 1 | 2,
    from: PageViewType,
    to: PageViewType | "exit",
  ) => {
    const key = `${step}|${from}|${to}`;
    const row = paths.get(key) ?? { step, from, to, sessions: 0 };
    row.sessions += 1;
    paths.set(key, row);
  };
  for (const session of current) {
    const pages = session.events.map((event) => event.pageType);
    addPath(1, pages[0]!, pages[1] ?? "exit");
    if (pages.length >= 2) addPath(2, pages[1]!, pages[2] ?? "exit");
  }

  // ── 콘텐츠 ──
  type ContentAcc = {
    pageType: PageViewType;
    resourceId: string;
    views: number;
    visitors: Set<string>;
    engagedSum: number;
    engagedCount: number;
    entries: number;
    bounces: number;
  };
  const contents = new Map<string, ContentAcc>();
  for (const session of current) {
    session.events.forEach((event, index) => {
      const key = `${event.pageType}|${event.resourceId}`;
      const acc = contents.get(key) ?? {
        pageType: event.pageType,
        resourceId: event.resourceId,
        views: 0,
        visitors: new Set<string>(),
        engagedSum: 0,
        engagedCount: 0,
        entries: 0,
        bounces: 0,
      };
      acc.views += 1;
      acc.visitors.add(event.visitorId);
      if (event.engagedMs !== null) {
        acc.engagedSum += event.engagedMs;
        acc.engagedCount += 1;
      }
      if (index === 0) {
        acc.entries += 1;
        if (session.events.length === 1) acc.bounces += 1;
      }
      contents.set(key, acc);
    });
  }
  const content: ContentRow[] = [...contents.values()]
    .sort((a, b) => b.views - a.views)
    .slice(0, CONTENT_LIMIT)
    .map((acc) => ({
      pageType: acc.pageType,
      resourceId: acc.resourceId,
      views: acc.views,
      visitors: acc.visitors.size,
      avgEngagedMs:
        acc.engagedCount === 0
          ? null
          : Math.round(acc.engagedSum / acc.engagedCount),
      entries: acc.entries,
      bounceRate: acc.entries === 0 ? null : ratio(acc.bounces, acc.entries),
    }));

  // ── 분포 ──
  const depthCounts = countBy(current, (s) =>
    s.events.length >= 5 ? "5+" : String(s.events.length),
  );
  const durationCounts = countBy(current.filter(isMeasured), (s) => {
    const engaged = engagedMsOf(s);
    return DURATION_BUCKETS.find((bucket) => engaged < bucket.underMs)!.bucket;
  });

  // ── 코호트 ──
  const activeWeeks = new Map<string, Set<string>>();
  for (const session of current) {
    for (const event of session.events) {
      const weeks = activeWeeks.get(event.visitorId) ?? new Set<string>();
      weeks.add(mondayOf(toKstDate(event.visitedAt)));
      activeWeeks.set(event.visitorId, weeks);
    }
  }
  const cohortMembers = new Map<string, string[]>();
  for (const visitorId of visitorIds) {
    const first = firstSeenOf(visitorId);
    if (first < currentStart) continue;
    const week = mondayOf(toKstDate(first));
    cohortMembers.set(week, [...(cohortMembers.get(week) ?? []), visitorId]);
  }
  const cohorts = [...cohortMembers.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, members]) => ({
      week,
      size: members.length,
      retention: Array.from({ length: COHORT_WEEKS }, (_, index) => {
        const target = addDays(week, 7 * (index + 1));
        // 기간 안에 다 들어오지 않은 주는 아직 끝나지 않았으므로 0%가 아니라 빈칸이다.
        if (addDays(target, 6) > range.to) return null;
        const returned = members.filter((v) =>
          activeWeeks.get(v)?.has(target),
        ).length;
        return ratio(returned, members.length);
      }),
    }));

  return {
    range: {
      from: range.from,
      to: range.to,
      days: range.days,
      granularity: range.granularity,
    },
    previousRange: { from: range.previous.from, to: range.previous.to },
    eventsTrackedSince: trackedSince,
    segmented: isSegmented(segment),
    summary: {
      ...currentSummary,
      views: legacy !== null ? sum(legacy.current) : currentSummary.views,
      newVisitors,
      returningVisitors: visitorIds.size - newVisitors,
      prev: {
        ...previousCore,
        views: legacy !== null ? sum(legacy.previous) : previousCore.views,
      },
    },
    trend,
    hourly,
    referrerFlow: [...flows.values()].sort((a, b) => b.sessions - a.sessions),
    pathFlow: [...paths.values()].sort(
      (a, b) => a.step - b.step || b.sessions - a.sessions,
    ),
    content,
    devices: byCountDesc(countBy(current, (s) => s.device)).map(
      ([device, count]) => ({
        device: device as PageViewDevice,
        sessions: count,
      }),
    ),
    audience: {
      member: current.filter((s) => s.isMember).length,
      external: current.filter((s) => !s.isMember).length,
    },
    depth: DEPTH_BUCKETS.map((bucket) => ({
      bucket,
      sessions: depthCounts.get(bucket) ?? 0,
    })),
    duration: DURATION_BUCKETS.map(({ bucket }) => ({
      bucket,
      sessions: durationCounts.get(bucket) ?? 0,
    })),
    cohorts,
    // 필터를 바꿀 선택지이므로 현재 세그먼트와 무관하게 전체 세션에서 뽑는다.
    referrerOptions: byCountDesc(countBy(currentAll, (s) => s.referrer))
      .filter(([host]) => host !== "other")
      .slice(0, REFERRER_OPTION_LIMIT)
      .map(([host]) => host),
  };
};
