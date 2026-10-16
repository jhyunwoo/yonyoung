import type { ApiInsightsPageType, ApiPageViewGranularity } from "@yonyoung/contracts";

export type StatsPreset = "7d" | "30d" | "6m" | "1y";

export const STATS_PRESETS: ReadonlyArray<{
  value: StatsPreset;
  label: string;
  days: number;
}> = [
  { value: "7d", label: "7일", days: 7 },
  { value: "30d", label: "30일", days: 30 },
  { value: "6m", label: "6개월", days: 182 },
  { value: "1y", label: "1년", days: 365 },
];

const DEFAULT_PRESET: StatsPreset = "30d";

/** API의 MAX_ANALYTICS_RANGE_DAYS와 같아야 한다. */
export const MAX_STATS_RANGE_DAYS = 731;

export type StatsFilters = {
  audience: "all" | "external" | "member";
  device: "all" | "mobile" | "tablet" | "desktop";
  /** "all" | "direct" | 호스트명 */
  referrer: string;
  landing: "all" | ApiInsightsPageType;
};

export type StatsMetric = "views" | "visitors" | "sessions" | "duration";

export const DEFAULT_FILTERS: StatsFilters = {
  audience: "all",
  device: "all",
  referrer: "all",
  landing: "all",
};

/**
 * 프리셋은 URL에 `range=6m`처럼 상대값으로 남긴다. 공유한 링크를 나중에 열어도 "최근 6개월"로 보인다.
 * granularity가 null이면 API가 기간 길이에 맞춰 고른다.
 * metric은 화면 전용이라 API로 보내지 않는다.
 */
export type StatsQuery = {
  preset: StatsPreset | "custom";
  from: string;
  to: string;
  granularity: ApiPageViewGranularity | null;
  filters: StatsFilters;
  metric: StatsMetric;
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const toUtcMs = (date: string): number => Date.parse(`${date}T00:00:00Z`);
const formatUtcDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const addDays = (date: string, days: number): string =>
  formatUtcDate(toUtcMs(date) + days * DAY_MS);

export const kstToday = (nowMs: number = Date.now()): string =>
  formatUtcDate(nowMs + KST_OFFSET_MS);

export const daysBetweenInclusive = (from: string, to: string): number =>
  Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS) + 1;

export const isValidDate = (value: string | undefined): value is string =>
  value !== undefined &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(toUtcMs(value)) &&
  formatUtcDate(toUtcMs(value)) === value;

/** 직접 지정한 기간의 문제를 사용자에게 보여 줄 문구로 돌려준다. 문제가 없으면 null. */
export const validateCustomRange = (
  from: string,
  to: string,
  today: string,
): string | null => {
  if (!isValidDate(from) || !isValidDate(to))
    return "시작일과 종료일을 모두 입력해 주세요.";
  if (to > today) return "종료일은 오늘 이후로 정할 수 없습니다.";
  if (from > to) return "시작일은 종료일보다 늦을 수 없습니다.";
  if (daysBetweenInclusive(from, to) > MAX_STATS_RANGE_DAYS) {
    return `조회 기간은 최대 ${MAX_STATS_RANGE_DAYS}일(약 2년)입니다.`;
  }
  return null;
};

const presetRange = (preset: StatsPreset, today: string) => {
  const days = STATS_PRESETS.find((item) => item.value === preset)!.days;
  return { from: addDays(today, -(days - 1)), to: today };
};

const readParam = (params: SearchParamsRecord, key: string): string | undefined => {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
};

const isPreset = (value: string | undefined): value is StatsPreset =>
  STATS_PRESETS.some((item) => item.value === value);

const isGranularity = (value: string | undefined): value is ApiPageViewGranularity =>
  value === "day" || value === "week" || value === "month";

const AUDIENCES = ["all", "external", "member"] as const;
const DEVICES = ["all", "mobile", "tablet", "desktop"] as const;
const LANDINGS = ["all", "home", "activity", "exhibition", "notice"] as const;
const METRICS = ["views", "visitors", "sessions", "duration"] as const;
// API의 normalizeReferrerHost가 저장하는 형태(소문자 호스트, direct)만 받는다.
const REFERRER_PATTERN = /^(all|direct|[a-z0-9-]+(\.[a-z0-9-]+)+)$/;

const pick = <T extends string>(
  allowed: readonly T[],
  value: string | undefined,
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

const parseFilters = (params: SearchParamsRecord): StatsFilters => {
  const referrer = readParam(params, "referrer");
  return {
    audience: pick(AUDIENCES, readParam(params, "audience"), "all"),
    device: pick(DEVICES, readParam(params, "device"), "all"),
    referrer:
      referrer !== undefined && REFERRER_PATTERN.test(referrer) ? referrer : "all",
    landing: pick(LANDINGS, readParam(params, "landing"), "all"),
  };
};

const FILTER_KEYS = ["audience", "device", "referrer", "landing"] as const;

const appendFilters = (params: URLSearchParams, filters: StatsFilters) => {
  for (const key of FILTER_KEYS) {
    if (filters[key] !== "all") params.set(key, filters[key]);
  }
};

export const activeFilterCount = (filters: StatsFilters): number =>
  FILTER_KEYS.filter((key) => filters[key] !== "all").length;

export const presetQuery = (preset: StatsPreset, today: string): StatsQuery => ({
  preset,
  ...presetRange(preset, today),
  granularity: null,
  filters: DEFAULT_FILTERS,
  metric: "views",
});

/** 손으로 고친 URL처럼 잘못된 값은 버리고 기본값(최근 30일)으로 돌아간다. */
export const parseStatsSearchParams = (
  params: SearchParamsRecord,
  today: string = kstToday(),
): StatsQuery => {
  const granularityParam = readParam(params, "granularity");
  const granularity = isGranularity(granularityParam) ? granularityParam : null;
  const filters = parseFilters(params);
  const metric = pick(METRICS, readParam(params, "metric"), "views");

  const from = readParam(params, "from");
  const to = readParam(params, "to");
  if (
    isValidDate(from) &&
    isValidDate(to) &&
    validateCustomRange(from, to, today) === null
  ) {
    return { preset: "custom", from, to, granularity, filters, metric };
  }

  const rangeParam = readParam(params, "range");
  const preset = isPreset(rangeParam) ? rangeParam : DEFAULT_PRESET;
  return { ...presetQuery(preset, today), granularity, filters, metric };
};

/** 화면 URL용. 기본값은 생략해 `/dashboard/stats`가 그대로 최근 30일을 뜻하게 한다. */
export const toStatsSearch = (query: StatsQuery): string => {
  const params = new URLSearchParams();
  if (query.preset === "custom") {
    params.set("from", query.from);
    params.set("to", query.to);
  } else if (query.preset !== DEFAULT_PRESET) {
    params.set("range", query.preset);
  }
  if (query.granularity !== null) {
    params.set("granularity", query.granularity);
  }
  appendFilters(params, query.filters);
  if (query.metric !== "views") {
    params.set("metric", query.metric);
  }
  return params.toString();
};

/** API 요청용. 프리셋도 절대 날짜로 풀어 보낸다. */
export const toInsightsApiSearch = (query: StatsQuery): string => {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.granularity !== null) {
    params.set("granularity", query.granularity);
  }
  appendFilters(params, query.filters);
  return params.toString();
};
