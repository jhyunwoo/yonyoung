"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { Bar, BarChart, BarXAxis, ChartTooltip, Grid } from "@/components/charts";
import { formatCount } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const DEPTH_LABEL = {
  "1": "1페이지",
  "2": "2페이지",
  "3": "3페이지",
  "4": "4페이지",
  "5+": "5페이지+",
} as const;
const DURATION_LABEL = {
  "<10s": "10초 미만",
  "10-30s": "10~30초",
  "30s-1m": "30초~1분",
  "1-3m": "1~3분",
  "3-10m": "3~10분",
  "10m+": "10분 이상",
} as const;

const Distribution = ({ rows }: { rows: Array<{ name: string; sessions: number }> }) => (
  <BarChart data={rows} xDataKey="name" aspectRatio="2 / 1">
    <Grid horizontal />
    <Bar dataKey="sessions" fill="var(--chart-1)" lineCap={4} />
    <BarXAxis showAllLabels />
    <ChartTooltip
      rows={(point) => [
        {
          color: "var(--chart-1)",
          label: "세션",
          value: `${formatCount(Number(point.sessions))}회`,
        },
      ]}
    />
  </BarChart>
);

export function DepthCard({ insights }: { insights: ApiVisitorInsights }) {
  const rows = insights.depth.map((row) => ({
    name: DEPTH_LABEL[row.bucket],
    sessions: row.sessions,
  }));
  return (
    <ChartCard
      testId="stats-depth"
      title="세션 깊이"
      description="한 세션에서 본 페이지 수"
      empty={
        rows.every((row) => row.sessions === 0)
          ? "이 기간·조건에 기록된 세션이 없습니다."
          : null
      }
      table={{
        columns: ["페이지 수", "세션"],
        rows: rows.map((row) => [row.name, formatCount(row.sessions)]),
      }}
    >
      <Distribution rows={rows} />
    </ChartCard>
  );
}

export function DurationCard({ insights }: { insights: ApiVisitorInsights }) {
  const rows = insights.duration.map((row) => ({
    name: DURATION_LABEL[row.bucket],
    sessions: row.sessions,
  }));
  return (
    <ChartCard
      testId="stats-duration"
      title="체류 시간 분포"
      description={
        insights.summary.unmeasuredSessions > 0
          ? `세션 기준, 측정 안 된 ${formatCount(insights.summary.unmeasuredSessions)}개 제외`
          : "세션 기준"
      }
      empty={
        rows.every((row) => row.sessions === 0)
          ? "체류 시간이 측정된 세션이 없습니다."
          : null
      }
      table={{
        columns: ["체류 시간", "세션"],
        rows: rows.map((row) => [row.name, formatCount(row.sessions)]),
      }}
    >
      <Distribution rows={rows} />
    </ChartCard>
  );
}
