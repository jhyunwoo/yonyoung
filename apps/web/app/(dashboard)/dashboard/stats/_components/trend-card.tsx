"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  ChartTooltip,
  ComposedChart,
  Grid,
  Line,
  ReferenceArea,
  SeriesBar,
  XAxis,
  YAxis,
} from "@/components/charts";
import { SegmentedControl } from "@/app/(dashboard)/_components/ui/segmented-control";
import {
  bucketToDate,
  metricValue,
  uncollectedRange,
} from "@/features/dashboard/stats/insights-chart-data";
import { formatCount, NEUTRAL_COLOR } from "@/features/dashboard/stats/insights-format";
import type { StatsMetric } from "@/features/dashboard/stats/stats-range";
import ChartCard from "./chart-card";

const GRANULARITY_LABEL = { day: "일", week: "주", month: "월" } as const;
const METRIC_OPTIONS: ReadonlyArray<{ value: StatsMetric; label: string }> = [
  { value: "views", label: "페이지뷰" },
  { value: "visitors", label: "방문자" },
  { value: "sessions", label: "세션" },
  { value: "duration", label: "평균 체류" },
];
const UNIT: Record<StatsMetric, string> = {
  views: "회",
  visitors: "명",
  sessions: "회",
  duration: "초",
};

type TrendCardProps = {
  insights: ApiVisitorInsights;
  metric: StatsMetric;
  onMetricChange: (metric: StatsMetric) => void;
};

export default function TrendCard({ insights, metric, onMetricChange }: TrendCardProps) {
  // 필터 없는 페이지뷰만 합계 테이블에서 오므로 수집 전 구간이 없다. 나머지는 이벤트 기반이다.
  const usesEvents = metric !== "views" || insights.segmented;
  const pending = usesEvents ? uncollectedRange(insights.trend) : null;
  const data = insights.trend.map((point) => {
    const { current, previous } = metricValue(point, metric);
    return {
      date: bucketToDate(point.bucket),
      current,
      previous,
      newVisitors: point.newVisitors,
      returningVisitors: point.returningVisitors,
    };
  });
  const hasAny = data.some((row) => row.current > 0 || row.previous > 0);
  const unit = UNIT[metric];

  return (
    <ChartCard
      testId="stats-trend"
      title="추이"
      description={`${GRANULARITY_LABEL[insights.range.granularity]} 단위, 빈 날은 0으로 표시`}
      actions={
        <SegmentedControl
          label="추이 지표"
          options={METRIC_OPTIONS}
          value={metric}
          onChange={onMetricChange}
          testIdPrefix="btn-stats-metric"
        />
      }
      empty={
        hasAny
          ? null
          : "이 기간과 비교 기간 모두 기록이 없습니다. 기간을 넓히거나 필터를 줄여 보세요."
      }
      table={{
        columns: ["구간", `선택 기간(${unit})`, `이전 기간(${unit})`],
        rows: insights.trend.map((point, index) => [
          point.collected || !usesEvents ? point.bucket : `${point.bucket} (수집 전)`,
          formatCount(data[index]!.current),
          formatCount(data[index]!.previous),
        ]),
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-4 text-caption text-ink-muted">
        {metric === "visitors" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-xs bg-(--chart-1)"
              />
              신규
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-xs bg-(--chart-3)"
              />
              재방문
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-(--chart-1)" />
            선택 기간
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-4 border-t-2 border-dashed border-(--chart-5)"
          />
          이전 기간
        </span>
        {pending && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-4 rounded-xs bg-canvas-soft" />
            수집 전
          </span>
        )}
      </div>
      <ComposedChart data={data} stacked={metric === "visitors"} aspectRatio="5 / 2">
        <Grid horizontal />
        {pending && (
          <ReferenceArea
            x1={pending.from}
            x2={pending.to}
            fill="var(--canvas-soft)"
            fillOpacity={1}
          />
        )}
        {metric === "visitors" ? (
          <>
            <SeriesBar dataKey="newVisitors" fill="var(--chart-1)" radius={2} />
            <SeriesBar dataKey="returningVisitors" fill="var(--chart-3)" radius={2} />
          </>
        ) : (
          <Line dataKey="current" stroke="var(--chart-1)" />
        )}
        <Line
          dataKey="previous"
          stroke={NEUTRAL_COLOR}
          dashFromIndex={0}
          dashArray="4,4"
        />
        <XAxis />
        <YAxis formatValue={(value: number) => formatCount(value)} />
        <ChartTooltip
          rows={(point) => [
            ...(metric === "visitors"
              ? [
                  {
                    color: "var(--chart-1)",
                    label: "신규",
                    value: formatCount(Number(point.newVisitors)),
                  },
                  {
                    color: "var(--chart-3)",
                    label: "재방문",
                    value: formatCount(Number(point.returningVisitors)),
                  },
                ]
              : [
                  {
                    color: "var(--chart-1)",
                    label: "선택 기간",
                    value: `${formatCount(Number(point.current))}${unit}`,
                  },
                ]),
            {
              color: NEUTRAL_COLOR,
              label: "이전 기간",
              value: `${formatCount(Number(point.previous))}${unit}`,
            },
          ]}
        />
      </ComposedChart>
    </ChartCard>
  );
}
