"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ApiPageViewAnalytics } from "@yonyoung/contracts";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  CalendarIcon,
  DownloadIcon,
  LogInIcon,
  TrophyIcon,
} from "lucide-react";
import PageViewChart from "@/app/(dashboard)/_components/dashboard-page-views-chart";
import { Button } from "@/app/(dashboard)/_components/ui/button";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { StatTile } from "@/app/(dashboard)/_components/ui/stat-tile";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  toAnalyticsApiSearch,
  toStatsSearch,
  trendCsvFileName,
  trendToCsv,
  type StatsQuery,
} from "@/features/dashboard/stats/stats-range";
import { AdminApiError } from "@/shared/http/http";
import BarList from "./_components/bar-list";
import StatsRangeControls from "./_components/stats-range-controls";
import TopContentList from "./_components/top-content-list";

type StatsViewProps = {
  query: StatsQuery;
  today: string;
  analytics: ApiPageViewAnalytics | null;
  error: string | null;
};

const REFRESH_INTERVAL_MS = 10_000;

const GRANULARITY_LABEL = { day: "일", week: "주", month: "월" } as const;
const PAGE_TYPE_LABEL = {
  home: "홈",
  activity: "활동",
  exhibition: "전시",
  notice: "공지",
} as const;
const DEVICE_LABEL = { mobile: "모바일", tablet: "태블릿", desktop: "데스크톱" } as const;
const WEEKDAY_LABEL = ["월", "화", "수", "목", "금", "토", "일"] as const;

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const referrerLabel = (host: string) => {
  if (host === "direct") return "직접 접속";
  if (host === "other") return "기타";
  return host;
};

/**
 * 이전 기간 대비 증감. 이전 값이 0이면 비율이 의미가 없어 "+100%" 같은 숫자를 만들지 않고 문장으로 쓴다.
 * 화살표와 부호를 함께 써서 색만으로 증감을 전달하지 않는다.
 */
const Delta = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0) {
    return <>이전 기간 기록 없음</>;
  }
  const growth = ((current - previous) / previous) * 100;
  const isUp = growth >= 0;
  return (
    <span className="break-keep">
      <span
        className={`inline-flex items-center gap-0.5 whitespace-nowrap font-semibold tabular-nums ${
          isUp ? "text-success-text" : "text-danger-text"
        }`}
      >
        {isUp ? (
          <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
        )}
        {isUp ? "+" : "-"}
        {Math.abs(growth).toFixed(1)}%
      </span>{" "}
      이전 기간 대비
    </span>
  );
};

const downloadCsv = (analytics: ApiPageViewAnalytics) => {
  const url = URL.createObjectURL(
    new Blob([trendToCsv(analytics)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = trendCsvFileName(analytics);
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function StatsView({
  query,
  today,
  analytics: initialAnalytics,
  error: initialError,
}: StatsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [error, setError] = useState(initialError);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  // 과거 기간은 숫자가 바뀌지 않으므로 오늘이 포함될 때만 주기적으로 다시 불러온다.
  const isLive = query.to === today;

  useEffect(() => {
    if (!isLive) return;
    let active = true;

    // 갱신 시각은 클라이언트 로컬 시간이라 렌더 중에 계산하면 hydration 이 어긋난다.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트에서만 알 수 있는 값이다.
    setLastUpdated(formatTime());

    const refresh = async () => {
      try {
        const data = await adminRequest<ApiPageViewAnalytics>(
          `/admin/page-views/analytics?${toAnalyticsApiSearch(query)}`,
          "GET",
        );
        if (!active) return;
        setAnalytics(data);
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

    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isLive, query]);

  const navigate = (next: StatsQuery) => {
    const search = toStatsSearch(next);
    startTransition(() => {
      router.replace(search === "" ? pathname : `${pathname}?${search}`, {
        scroll: false,
      });
    });
  };

  const header = (
    <PageHeader
      title="방문 통계"
      description={
        analytics !== null
          ? `${analytics.range.from} ~ ${analytics.range.to} (${analytics.range.days}일), 비교 기간 ${analytics.previousRange.from} ~ ${analytics.previousRange.to}${
              isLive && lastUpdated !== null ? `. ${lastUpdated} 기준, 10초마다 갱신` : ""
            }`
          : "기간을 골라 방문 추이와 유입 경로를 확인합니다."
      }
      actions={
        analytics !== null ? (
          <Button
            variant="utility"
            leadingIcon={<DownloadIcon className="h-4 w-4" aria-hidden="true" />}
            onClick={() => downloadCsv(analytics)}
            data-testid="btn-stats-csv"
          >
            CSV로 내려받기
          </Button>
        ) : undefined
      }
    />
  );

  const controls = (
    <StatsRangeControls
      query={query}
      today={today}
      granularity={analytics?.range.granularity ?? query.granularity ?? "day"}
      onChange={navigate}
    />
  );

  if (analytics === null) {
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

  const { summary } = analytics;
  const hasAnyViews = summary.totalViews > 0 || summary.prevTotalViews > 0;
  const entriesNote =
    analytics.entriesTrackedSince === null
      ? "유입 경로와 기기는 이번 업데이트 배포 후부터 수집됩니다."
      : analytics.range.to < analytics.entriesTrackedSince
        ? `이 기간은 수집 시작일(${analytics.entriesTrackedSince}) 이전이라 데이터가 없습니다.`
        : "이 기간에 기록된 진입이 없습니다.";

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="조회수"
          value={summary.totalViews.toLocaleString("ko-KR")}
          caption={
            <Delta current={summary.totalViews} previous={summary.prevTotalViews} />
          }
          Icon={BarChart3Icon}
          accent="sky"
        />
        <StatTile
          label="일평균 조회수"
          value={summary.dailyAverage.toLocaleString("ko-KR", {
            maximumFractionDigits: 1,
          })}
          caption={`${analytics.range.days}일 기준`}
          Icon={CalendarIcon}
          accent="teal"
        />
        <StatTile
          label="최고 조회일"
          value={
            summary.peak !== null ? summary.peak.count.toLocaleString("ko-KR") : "없음"
          }
          caption={
            summary.peak !== null ? summary.peak.date : "이 기간에 조회가 없습니다"
          }
          Icon={TrophyIcon}
          accent="orange"
        />
        <StatTile
          label="진입 수"
          value={summary.entries.toLocaleString("ko-KR")}
          caption={
            summary.entries > 0 ? (
              <>
                진입당 {(summary.totalViews / summary.entries).toFixed(1)}페이지,{" "}
                <Delta current={summary.entries} previous={summary.prevEntries} />
              </>
            ) : (
              entriesNote
            )
          }
          Icon={LogInIcon}
          accent="green"
        />
      </div>

      <Card>
        <CardHeader
          title="조회수 추이"
          description={`${GRANULARITY_LABEL[analytics.range.granularity]} 단위, 빈 날은 0으로 표시`}
          actions={
            <div className="flex items-center gap-4 text-caption text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="h-0.5 w-4 rounded-full bg-primary" />
                선택 기간
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="w-4 border-t-2 border-dashed border-ink-muted"
                />
                이전 기간
              </span>
            </div>
          }
        />
        <div className="mt-6">
          {hasAnyViews ? (
            <PageViewChart
              data={analytics.trend.map((point) => ({
                date: point.bucket,
                count: point.views,
              }))}
              comparison={analytics.trend.map((point) => point.prevViews)}
              unit="회"
            />
          ) : (
            <p className="text-caption text-ink-muted">
              이 기간과 비교 기간 모두 기록된 조회가 없습니다. 기간을 넓혀 보세요.
            </p>
          )}
        </div>
        {hasAnyViews && (
          <details className="mt-6 text-body-sm">
            <summary className="min-h-11 cursor-pointer content-center rounded-xs text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
              표로 보기
            </summary>
            <div className="mt-2 max-h-80 overflow-auto rounded-md border border-hairline">
              <table className="w-full text-left tabular-nums">
                <thead className="sticky top-0 bg-canvas-soft text-caption text-ink-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      구간
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      조회수
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      이전 기간
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {analytics.trend.map((point) => (
                    <tr key={point.bucket}>
                      <td className="px-3 py-2 text-ink">{point.bucket}</td>
                      <td className="px-3 py-2 text-right text-ink">
                        {point.views.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-muted">
                        {point.prevViews.toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="많이 본 활동" description="이 기간 조회수 상위 10개" />
          <div className="mt-4">
            <TopContentList
              items={analytics.topActivities}
              hrefPrefix="/archive/records"
              emptyMessage="이 기간에 조회된 활동이 없습니다."
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="많이 본 전시" description="이 기간 조회수 상위 10개" />
          <div className="mt-4">
            <TopContentList
              items={analytics.topExhibitions}
              hrefPrefix="/archive/exhibitions"
              emptyMessage="이 기간에 조회된 전시가 없습니다."
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="페이지 종류별 조회수" />
          <div className="mt-4">
            <BarList
              scale="total"
              unit="회"
              emptyMessage="이 기간에 기록된 조회가 없습니다."
              items={analytics.byPageType.map((row) => ({
                key: row.pageType,
                label: PAGE_TYPE_LABEL[row.pageType],
                value: row.views,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="기기" description="진입 기준" />
          <div className="mt-4">
            <BarList
              scale="total"
              unit="회"
              emptyMessage={entriesNote}
              items={analytics.devices.map((row) => ({
                key: row.device,
                label: DEVICE_LABEL[row.device],
                value: row.entries,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="요일별 평균 조회수" description="하루 평균, 월요일부터" />
          <div className="mt-4">
            <BarList
              scale="max"
              unit="회"
              decimal
              emptyMessage="이 기간에 기록된 조회가 없습니다."
              items={analytics.weekdays.map((row) => ({
                key: String(row.weekday),
                label: WEEKDAY_LABEL[row.weekday] ?? String(row.weekday),
                value: row.averageViews,
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="유입 경로" description="진입 기준, 상위 10개 밖은 기타" />
          <div className="mt-4">
            <BarList
              scale="total"
              unit="회"
              emptyMessage={entriesNote}
              items={analytics.referrers.map((row) => ({
                key: row.host,
                label: referrerLabel(row.host),
                value: row.entries,
              }))}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
