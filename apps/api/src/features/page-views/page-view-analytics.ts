import type {
  PageViewAnalyticsRange,
  PageViewGranularity,
} from "../../lib/services/types";
import { AppError } from "../../shared/errors/AppError";

const DAY_MS = 24 * 60 * 60 * 1000;
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const MAX_ANALYTICS_RANGE_DAYS = 731;
const DEFAULT_RANGE_DAYS = 30;

type DailyPoint = { date: string; count: number };

// `YYYY-MM-DD` 문자열은 UTC 자정으로 해석해 날짜 산술만 한다. 시간대 변환은 아래 두 함수에서만 한다.
const toUtcMs = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const formatUtcDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string =>
  formatUtcDate(toUtcMs(date) + days * DAY_MS);

const isValidDate = (date: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  !Number.isNaN(toUtcMs(date)) &&
  formatUtcDate(toUtcMs(date)) === date;

export const toKstDate = (timestampMs: number): string =>
  formatUtcDate(timestampMs + KST_OFFSET_MS);

/** KST 날짜의 자정을 UTC 시각으로 돌려준다. page_views.visited_at 비교에 쓴다. */
export const kstDateStartMs = (date: string): number =>
  toUtcMs(date) - KST_OFFSET_MS;

const daysBetweenInclusive = (from: string, to: string): number =>
  Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS) + 1;

export const autoGranularity = (days: number): PageViewGranularity => {
  if (days <= 31) return "day";
  if (days <= 183) return "week";
  return "month";
};

export const resolveAnalyticsRange = (
  query: { from?: string; to?: string; granularity?: PageViewGranularity },
  nowMs: number,
): PageViewAnalyticsRange => {
  const today = toKstDate(nowMs);

  if (query.from !== undefined && !isValidDate(query.from)) {
    throw AppError.badRequest("from은 YYYY-MM-DD 형식의 실제 날짜여야 합니다.");
  }
  if (query.to !== undefined && !isValidDate(query.to)) {
    throw AppError.badRequest("to는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.");
  }

  // 미래 날짜는 집계할 데이터가 없으므로 오늘로 맞춘다.
  const to = query.to === undefined || query.to > today ? today : query.to;
  const from = query.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));

  if (from > to) {
    throw AppError.badRequest("시작일은 종료일보다 늦을 수 없습니다.");
  }

  const days = daysBetweenInclusive(from, to);
  if (days > MAX_ANALYTICS_RANGE_DAYS) {
    throw AppError.badRequest(
      `조회 기간은 최대 ${MAX_ANALYTICS_RANGE_DAYS}일입니다.`,
    );
  }

  const previousTo = addDays(from, -1);
  return {
    from,
    to,
    days,
    granularity: query.granularity ?? autoGranularity(days),
    previous: { from: addDays(previousTo, -(days - 1)), to: previousTo },
  };
};

export const fillDailySeries = (
  rows: readonly DailyPoint[],
  from: string,
  to: string,
): DailyPoint[] => {
  const counts = new Map(rows.map((row) => [row.date, row.count]));
  const series: DailyPoint[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    series.push({ date, count: counts.get(date) ?? 0 });
  }
  return series;
};

// getUTCDay()는 일요일이 0이다. 주 시작을 월요일로 맞추려고 월요일=0으로 바꾼다.
const mondayBasedWeekday = (date: string): number =>
  (new Date(toUtcMs(date)).getUTCDay() + 6) % 7;

const bucketKey = (date: string, granularity: PageViewGranularity): string => {
  if (granularity === "month") return date.slice(0, 7);
  if (granularity === "week") return addDays(date, -mondayBasedWeekday(date));
  return date;
};

/**
 * 이전 기간의 i번째 날은 현재 기간 i번째 날과 같은 버킷에 넣는다.
 * 그래서 주·월 단위에서도 prevViews가 같은 길이의 구간끼리 비교된다.
 * 주 버킷 라벨은 월요일이 아니라 기간 안의 첫날이라, 첫 주가 잘려도 기간 밖 날짜가 보이지 않는다.
 */
export const bucketSeries = (
  current: readonly DailyPoint[],
  previous: readonly DailyPoint[],
  granularity: PageViewGranularity,
): Array<{ bucket: string; views: number; prevViews: number }> => {
  const buckets = new Map<
    string,
    { bucket: string; views: number; prevViews: number }
  >();
  current.forEach((day, index) => {
    const key = bucketKey(day.date, granularity);
    const label = granularity === "month" ? key : day.date;
    const entry = buckets.get(key) ?? { bucket: label, views: 0, prevViews: 0 };
    entry.views += day.count;
    entry.prevViews += previous[index]?.count ?? 0;
    buckets.set(key, entry);
  });
  return [...buckets.values()];
};

const roundToTenth = (value: number): number => Math.round(value * 10) / 10;

export const weekdayAverages = (
  series: readonly DailyPoint[],
): Array<{ weekday: number; averageViews: number }> => {
  const totals = Array.from({ length: 7 }, () => ({ sum: 0, days: 0 }));
  for (const day of series) {
    const slot = totals[mondayBasedWeekday(day.date)]!;
    slot.sum += day.count;
    slot.days += 1;
  }
  return totals.map((slot, weekday) => ({
    weekday,
    averageViews: slot.days === 0 ? 0 : roundToTenth(slot.sum / slot.days),
  }));
};

export const summarizeSeries = (series: readonly DailyPoint[]) => {
  let total = 0;
  let peak: DailyPoint | null = null;
  for (const day of series) {
    total += day.count;
    if (day.count > 0 && (peak === null || day.count > peak.count)) {
      peak = day;
    }
  }
  return {
    total,
    dailyAverage: series.length === 0 ? 0 : roundToTenth(total / series.length),
    peak,
  };
};
