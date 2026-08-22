"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiPageViewStats } from "@/shared/contracts/api-contracts";
import PageViewChart from "@/app/(dashboard)/_components/dashboard-page-views-chart";
import { ArrowDownIcon, ArrowUpIcon, BarChart3 } from "lucide-react";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import { AdminApiError } from "@/shared/http/http";

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return value.toLocaleString("ko-KR");
};

const calculateGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

type StatCardProps = {
  label: string;
  value: number;
  growth?: number;
  description?: string;
};

const StatCard = ({ label, value, growth, description }: StatCardProps) => (
  <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
    <div className="flex items-center justify-between gap-2">
      <p className="text-eyebrow text-ink-muted uppercase">{label}</p>
      {growth !== undefined && (
        // 화살표 아이콘 + 부호가 함께 있어 색만으로 증감을 전달하지 않는다.
        <span
          className={`flex items-center gap-0.5 text-caption font-semibold tabular-nums ${
            growth >= 0 ? "text-success-text" : "text-danger-text"
          }`}
        >
          {growth >= 0 ? (
            <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
          )}
          {growth >= 0 ? "+" : "-"}
          {Math.abs(growth).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="mt-2 text-h3 text-ink tabular-nums">{formatNumber(value)}</p>
    {description && <p className="mt-1 text-caption text-ink-muted">{description}</p>}
  </div>
);

type DashboardPageViewsCardProps = {
  initialStats: ApiPageViewStats | null;
  initialError?: string | null;
};

const getFormattedTime = () => {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export default function DashboardPageViewsCard({
  initialStats,
  initialError,
}: DashboardPageViewsCardProps) {
  const [stats, setStats] = useState<ApiPageViewStats | null>(initialStats);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (initialStats) {
      // 서버가 내려준 통계의 "갱신 시각"은 클라이언트 로컬 시간으로 보여 준다.
      // 렌더 중에 계산하면 서버 렌더 결과와 달라져 hydration 불일치가 나므로
      // 마운트 이후에만 채운다.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트에서만 알 수 있는 값이다.
      setLastUpdated(getFormattedTime());
    }

    const fetchStats = async () => {
      try {
        const data = await adminRequest<ApiPageViewStats>(
          "/admin/page-views/dashboard",
          "GET",
        );
        if (active) {
          setStats(data);
          setError(null);
          setLastUpdated(getFormattedTime());
        }
      } catch (err) {
        if (active) {
          const msg =
            err instanceof AdminApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : "알 수 없는 오류가 발생했습니다.";
          setError(msg);
          setStats(null);
        }
      }
    };

    const timer = setInterval(() => void fetchStats(), 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [initialStats]);

  const trend = stats?.dailyTrend ?? [];
  const todayViews = stats?.today.count ?? 0;
  const yesterdayViews = stats?.today.prevCount ?? 0;
  const dayGrowth = calculateGrowth(todayViews, yesterdayViews);

  const thisWeekViews = stats?.thisWeek.count ?? 0;
  const lastWeekViews = stats?.thisWeek.prevCount ?? 0;
  const weekGrowth = calculateGrowth(thisWeekViews, lastWeekViews);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={
          <Link
            href="/dashboard/stats"
            className="rounded-md transition-colors duration-150 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none"
          >
            방문 통계
          </Link>
        }
        description={
          stats !== null
            ? `최근 30일 추세${lastUpdated !== null ? ` · ${lastUpdated} 기준` : ""}`
            : undefined
        }
      />

      {stats === null ? (
        <div className="mt-5">
          <EmptyState
            Icon={BarChart3}
            accent="purple"
            title="방문 통계를 불러오지 못했습니다"
            description={
              error !== null
                ? `원인: ${error}`
                : "잠시 후 자동으로 다시 시도합니다. 계속 실패하면 새로고침해 주세요."
            }
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-1 flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="오늘 방문"
              value={todayViews}
              growth={dayGrowth}
              description="어제 대비"
            />
            <StatCard
              label="이번 주 방문"
              value={thisWeekViews}
              growth={weekGrowth}
              description="지난주 대비"
            />
          </div>

          <div className="rounded-lg border border-hairline p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-body-sm font-semibold text-ink">일별 방문자 추이</h3>
              <span className="flex items-center gap-1.5 text-caption text-ink-muted">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
                방문자 수
              </span>
            </div>
            <PageViewChart data={trend} />
          </div>
        </div>
      )}
    </Card>
  );
}
