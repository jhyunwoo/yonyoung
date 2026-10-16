"use client";

import type { ApiVisitorInsights } from "@yonyoung/contracts";
import {
  BarChart3Icon,
  ClockIcon,
  LayersIcon,
  LogOutIcon,
  MousePointerClickIcon,
  UsersIcon,
} from "lucide-react";
import { Line, LineChart } from "@/components/charts";
import { StatTile } from "@/app/(dashboard)/_components/ui/stat-tile";
import { bucketToDate } from "@/features/dashboard/stats/insights-chart-data";
import {
  formatCount,
  formatDuration,
  formatPercent,
} from "@/features/dashboard/stats/insights-format";
import Delta from "./delta";

type TrendKey = "views" | "visitors" | "sessions" | "avgSessionMs";

const Sparkline = ({
  insights,
  dataKey,
}: {
  insights: ApiVisitorInsights;
  dataKey: TrendKey;
}) => (
  // 숫자는 타일이 전달한다. 스파크라인은 흐름만 보여 주는 장식이라 보조 기술에서 숨긴다.
  <div aria-hidden="true" className="h-8 w-full">
    <LineChart
      data={insights.trend.map((point) => ({
        date: bucketToDate(point.bucket),
        value: point[dataKey],
      }))}
      aspectRatio="6 / 1"
      margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
    >
      <Line dataKey="value" stroke="var(--chart-1)" />
    </LineChart>
  </div>
);

export default function KpiGrid({ insights }: { insights: ApiVisitorInsights }) {
  const { summary } = insights;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="stats-kpis">
      <StatTile
        label="순방문자"
        value={formatCount(summary.visitors)}
        caption={<Delta current={summary.visitors} previous={summary.prev.visitors} />}
        footer={<Sparkline insights={insights} dataKey="visitors" />}
        Icon={UsersIcon}
        accent="sky"
      />
      <StatTile
        label="세션"
        value={formatCount(summary.sessions)}
        caption={<Delta current={summary.sessions} previous={summary.prev.sessions} />}
        footer={<Sparkline insights={insights} dataKey="sessions" />}
        Icon={LayersIcon}
        accent="teal"
      />
      <StatTile
        label="페이지뷰"
        value={formatCount(summary.views)}
        caption={<Delta current={summary.views} previous={summary.prev.views} />}
        footer={<Sparkline insights={insights} dataKey="views" />}
        Icon={BarChart3Icon}
        accent="purple"
      />
      <StatTile
        label="세션당 페이지"
        value={summary.pagesPerSession.toLocaleString("ko-KR", {
          maximumFractionDigits: 1,
        })}
        caption={
          <Delta
            current={summary.pagesPerSession}
            previous={summary.prev.pagesPerSession}
          />
        }
        Icon={MousePointerClickIcon}
        accent="green"
      />
      <StatTile
        label="평균 체류 시간"
        value={formatDuration(summary.avgSessionMs)}
        caption={
          <>
            <Delta current={summary.avgSessionMs} previous={summary.prev.avgSessionMs} />
            {summary.unmeasuredSessions > 0 && (
              <span className="block">
                측정 안 된 세션 {formatCount(summary.unmeasuredSessions)}개 제외
              </span>
            )}
          </>
        }
        footer={<Sparkline insights={insights} dataKey="avgSessionMs" />}
        Icon={ClockIcon}
        accent="orange"
      />
      <StatTile
        label="이탈률"
        value={formatPercent(summary.bounceRate)}
        caption={
          <>
            <Delta
              current={summary.bounceRate}
              previous={summary.prev.bounceRate}
              kind="points"
              lowerIsBetter
            />
            <span className="block">페이지 1개만 본 세션 비율</span>
          </>
        }
        Icon={LogOutIcon}
        accent="pink"
      />
    </div>
  );
}
