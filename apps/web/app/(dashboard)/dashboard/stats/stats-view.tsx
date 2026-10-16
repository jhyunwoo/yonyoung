"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ApiVisitorInsights } from "@yonyoung/contracts";
import { BarChart3Icon, DownloadIcon } from "lucide-react";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  insightsCsvFileName,
  insightsTrendToCsv,
} from "@/features/dashboard/stats/insights-format";
import {
  daysBetweenInclusive,
  toInsightsApiSearch,
  toStatsSearch,
  type StatsMetric,
  type StatsQuery,
} from "@/features/dashboard/stats/stats-range";
import { AdminApiError } from "@/shared/http/http";
import CohortCard from "./_components/cohort-card";
import CompositionCard from "./_components/composition-card";
import ContentTable from "./_components/content-table";
import { DepthCard, DurationCard } from "./_components/distribution-cards";
import { PathFlowCard, ReferrerFlowCard } from "./_components/flow-cards";
import HourlyHeatmapCard from "./_components/hourly-heatmap-card";
import KpiGrid from "./_components/kpi-grid";
import StatsFilterControls from "./_components/stats-filter-controls";
import StatsRangeControls from "./_components/stats-range-controls";
import TrendCard from "./_components/trend-card";

type StatsViewProps = {
  query: StatsQuery;
  today: string;
  insights: ApiVisitorInsights | null;
  error: string | null;
};

// 갱신마다 두 기간 이벤트를 다시 훑는다. 긴 기간은 비용이 크고 몇 초 단위 변화가 추이에 보이지도 않는다.
const SHORT_RANGE_DAYS = 7;
const refreshIntervalMs = (query: StatsQuery) =>
  daysBetweenInclusive(query.from, query.to) <= SHORT_RANGE_DAYS ? 10_000 : 60_000;

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const downloadCsv = (insights: ApiVisitorInsights) => {
  const url = URL.createObjectURL(
    new Blob([insightsTrendToCsv(insights)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = insightsCsvFileName(insights);
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function StatsView({
  query,
  today,
  insights: initialInsights,
  error: initialError,
}: StatsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [insights, setInsights] = useState(initialInsights);
  const [error, setError] = useState(initialError);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [metric, setMetric] = useState<StatsMetric>(query.metric);
  // 과거 기간은 숫자가 바뀌지 않으므로 오늘이 포함될 때만 주기적으로 다시 불러온다.
  const isLive = query.to === today;
  const refreshMs = refreshIntervalMs(query);

  useEffect(() => {
    if (!isLive) return;
    let active = true;

    // 갱신 시각은 클라이언트 로컬 시간이라 렌더 중에 계산하면 hydration 이 어긋난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트에서만 알 수 있는 값이다.
    setLastUpdated(formatTime());

    const refresh = async () => {
      // 아무도 보지 않는 탭까지 DB를 두드리지 않게 한다.
      if (document.visibilityState !== "visible") return;
      try {
        const data = await adminRequest<ApiVisitorInsights>(
          `/admin/page-views/insights?${toInsightsApiSearch(query)}`,
          "GET",
        );
        if (!active) return;
        setInsights(data);
        setError(null);
        setLastUpdated(formatTime());
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof AdminApiError || err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.",
        );
      }
    };

    const timer = setInterval(() => void refresh(), refreshMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isLive, query, refreshMs]);

  const navigate = (next: StatsQuery) => {
    const search = toStatsSearch({ ...next, metric });
    startTransition(() => {
      router.replace(search === "" ? pathname : `${pathname}?${search}`, {
        scroll: false,
      });
    });
  };

  // 지표는 같은 응답을 다르게 그릴 뿐이라 서버에 다시 묻지 않고 주소만 바꾼다.
  const changeMetric = (next: StatsMetric) => {
    setMetric(next);
    const search = toStatsSearch({ ...query, metric: next });
    window.history.replaceState(
      null,
      "",
      search === "" ? pathname : `${pathname}?${search}`,
    );
  };

  const header = (
    <PageHeader
      title="방문 통계"
      description={
        insights !== null
          ? `${insights.range.from} ~ ${insights.range.to} (${insights.range.days}일), 비교 기간 ${insights.previousRange.from} ~ ${insights.previousRange.to}${
              isLive && lastUpdated !== null
                ? `. ${lastUpdated} 기준, ${refreshMs / 1000}초마다 갱신`
                : ""
            }`
          : "기간과 조건을 골라 방문자 사용 패턴을 확인합니다."
      }
      actions={
        insights !== null ? (
          <Button
            variant="utility"
            leadingIcon={<DownloadIcon className="h-4 w-4" aria-hidden="true" />}
            onClick={() => downloadCsv(insights)}
            data-testid="btn-stats-csv"
          >
            CSV로 내려받기
          </Button>
        ) : undefined
      }
    />
  );

  const controls = (
    <div className="flex flex-col gap-4">
      <StatsRangeControls
        query={query}
        today={today}
        granularity={insights?.range.granularity ?? query.granularity ?? "day"}
        onChange={navigate}
      />
      <StatsFilterControls
        filters={query.filters}
        referrerOptions={insights?.referrerOptions ?? []}
        onChange={(filters) => navigate({ ...query, filters })}
      />
    </div>
  );

  if (insights === null) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {controls}
        <EmptyState
          Icon={BarChart3Icon}
          accent="purple"
          title="통계를 불러올 수 없습니다"
          description={
            error !== null
              ? `원인: ${error}. 기간을 바꾸거나 새로고침해 주세요.`
              : "잠시 후 새로고침해 주세요."
          }
        />
      </div>
    );
  }

  const trackedSince = insights.eventsTrackedSince;
  const collectionNote =
    trackedSince === null
      ? "방문자·세션 지표는 이번 업데이트 배포 후부터 수집됩니다. 지금은 페이지뷰 합계만 볼 수 있습니다."
      : insights.range.from < trackedSince
        ? `방문자·세션 지표는 ${trackedSince}부터 수집됐습니다. 그 전 구간은 0으로 보입니다${
            insights.segmented ? "" : "(필터 없는 페이지뷰는 전체 이력)"
          }.`
        : null;

  return (
    <div
      className="flex flex-col gap-6 transition-opacity duration-150 motion-reduce:transition-none data-[pending=true]:opacity-60"
      data-pending={isPending}
      aria-busy={isPending}
    >
      {header}
      {controls}

      {error !== null && (
        <p role="status" className="text-caption text-danger-text">
          최신 값으로 갱신하지 못했습니다({error}). 아래는 마지막으로 불러온 값입니다.
        </p>
      )}
      {insights.truncated && (
        <p
          role="note"
          data-testid="stats-truncated-note"
          className="text-caption text-warning-text"
        >
          기록이 많아 이 기간의 가장 최근 200,000건만 집계했습니다. 기간을 줄이면 전체가
          반영됩니다.
        </p>
      )}
      {collectionNote !== null && (
        <p
          role="note"
          data-testid="stats-collection-note"
          className="text-caption text-ink-muted"
        >
          {collectionNote}
        </p>
      )}

      <KpiGrid insights={insights} />
      <TrendCard insights={insights} metric={metric} onMetricChange={changeMetric} />

      {/* 히트맵 24열, 링 3개, 흐름도의 양쪽 라벨은 반폭 카드에서 겹치므로 한 줄씩 쓴다. */}
      <HourlyHeatmapCard insights={insights} />
      <CompositionCard insights={insights} />
      <ReferrerFlowCard insights={insights} />
      <PathFlowCard insights={insights} />
      <div className="grid gap-4 md:grid-cols-2">
        <DepthCard insights={insights} />
        <DurationCard insights={insights} />
      </div>
      <CohortCard insights={insights} />
      <ContentTable insights={insights} />
    </div>
  );
}
