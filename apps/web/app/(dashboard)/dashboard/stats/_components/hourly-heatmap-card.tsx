"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
  resolveHeatmapLevelStyles,
} from "@/components/charts";
import { toHourlyColumns } from "@/features/dashboard/stats/insights-chart-data";
import { formatCount, WEEKDAY_LABEL } from "@/features/dashboard/stats/insights-format";
import ChartCard from "./chart-card";

const LEVEL_COLORS = [
  "var(--chart-scale-01)",
  "var(--chart-scale-02)",
  "var(--chart-scale-03)",
  "var(--chart-scale-04)",
  "var(--chart-scale-05)",
] as const;
// 셀과 범례가 같은 순차 스케일을 쓰도록 한 번 만들어 둘 다에 넘긴다.
const LEVEL_STYLES = resolveHeatmapLevelStyles(LEVEL_COLORS);

export default function HourlyHeatmapCard({
  insights,
}: {
  insights: ApiVisitorInsights;
}) {
  const columns = toHourlyColumns(insights.hourly);
  const total = insights.hourly.reduce((sum, cell) => sum + cell.views, 0);
  const viewsAt = (weekday: number, hour: number) =>
    insights.hourly.find((cell) => cell.weekday === weekday && cell.hour === hour)
      ?.views ?? 0;

  return (
    <ChartCard
      testId="stats-hourly"
      title="요일 × 시간대"
      description="KST 기준 페이지뷰. 진할수록 많음"
      empty={total === 0 ? "이 기간·조건에 기록된 페이지뷰가 없습니다." : null}
      table={{
        columns: ["시간", ...WEEKDAY_LABEL],
        rows: Array.from({ length: 24 }, (_, hour) => [
          `${hour}시`,
          ...WEEKDAY_LABEL.map((_, weekday) => formatCount(viewsAt(weekday, hour))),
        ]),
      }}
    >
      <HeatmapInteractionProvider>
        <HeatmapInteractionBoundary>
          <div className="flex w-full flex-col items-stretch gap-3">
            <HeatmapChart
              className="w-full"
              data={columns}
              layout="fluid"
              levelStyles={LEVEL_STYLES}
            >
              <HeatmapCells />
              <HeatmapXAxis
                formatColumn={(hour) => (hour % 3 === 0 ? `${hour}시` : null)}
              />
              <HeatmapYAxis labels={WEEKDAY_LABEL} tickFilter="all" />
              <HeatmapTooltip
                formatHeader={({ column, row }) =>
                  `${WEEKDAY_LABEL[row]}요일 ${column}시`
                }
                formatLabel={(count) => `페이지뷰 ${formatCount(count)}회`}
              />
            </HeatmapChart>
            <HeatmapLegend lessLabel="적음" moreLabel="많음" levelStyles={LEVEL_STYLES} />
          </div>
        </HeatmapInteractionBoundary>
      </HeatmapInteractionProvider>
    </ChartCard>
  );
}
