import type { ApiVisitorInsights } from "@yonyoung/contracts";

export const PAGE_TYPE_LABEL = {
  home: "홈",
  activity: "활동",
  exhibition: "전시",
  notice: "공지",
} as const;

export const DEVICE_LABEL = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "데스크톱",
} as const;
export const AUDIENCE_LABEL = {
  all: "전체",
  external: "외부 방문자",
  member: "회원",
} as const;
export const WEEKDAY_LABEL = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 색은 엔티티에 고정한다. 필터로 항목 수가 바뀌어도 남은 항목 색이 바뀌지 않는다. */
export const PAGE_TYPE_COLOR = {
  home: "var(--chart-1)",
  activity: "var(--chart-2)",
  exhibition: "var(--chart-3)",
  notice: "var(--chart-4)",
} as const;
export const DEVICE_COLOR = {
  mobile: "var(--chart-1)",
  desktop: "var(--chart-2)",
  tablet: "var(--chart-3)",
} as const;
export const NEUTRAL_COLOR = "var(--chart-5)";

export const referrerLabel = (host: string): string => {
  if (host === "direct") return "직접 접속";
  if (host === "other") return "기타";
  return host;
};

export const formatCount = (value: number): string => value.toLocaleString("ko-KR");

export const formatPercent = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`;

export const formatDuration = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes}분` : `${minutes}분 ${rest}초`;
};

export const insightsTrendToCsv = (insights: ApiVisitorInsights): string => {
  const seconds = (ms: number) => String(Math.round(ms / 1000));
  const rows = [
    [
      "구간",
      "페이지뷰",
      "방문자",
      "세션",
      "평균 체류(초)",
      "신규 방문자",
      "재방문 방문자",
      "이전 페이지뷰",
      "이전 방문자",
      "이전 세션",
      "이전 평균 체류(초)",
      "수집 여부",
    ],
    ...insights.trend.map((point) => [
      point.bucket,
      String(point.views),
      String(point.visitors),
      String(point.sessions),
      seconds(point.avgSessionMs),
      String(point.newVisitors),
      String(point.returningVisitors),
      String(point.prevViews),
      String(point.prevVisitors),
      String(point.prevSessions),
      seconds(point.prevAvgSessionMs),
      point.collected ? "수집" : "수집 전",
    ]),
  ];
  // Excel이 UTF-8 한글을 깨뜨리지 않도록 BOM을 붙이고, 줄바꿈도 Excel 기본값인 CRLF를 쓴다.
  return `﻿${rows.map((row) => row.join(",")).join("\r\n")}\r\n`;
};

export const insightsCsvFileName = (insights: ApiVisitorInsights): string =>
  `visitor-insights_${insights.range.from}_${insights.range.to}_${insights.range.granularity}.csv`;
