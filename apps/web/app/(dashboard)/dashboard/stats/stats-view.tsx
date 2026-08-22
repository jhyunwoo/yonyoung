"use client";

import { useState, useMemo, useEffect } from "react";
import type { ApiPageViewStats } from "@/shared/contracts/api-contracts";
import PageViewChart from "@/app/(dashboard)/_components/dashboard-page-views-chart";
import { BarChart3Icon, CalendarIcon, MonitorIcon } from "lucide-react";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { SegmentedControl } from "@/app/(dashboard)/_components/ui/segmented-control";
import { StatTile } from "@/app/(dashboard)/_components/ui/stat-tile";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import { AdminApiError } from "@/shared/http/http";

type StatsViewProps = {
  stats: ApiPageViewStats | null;
  error?: string | null;
};

const getFormattedTime = () => {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export default function StatsView({
  stats: initialStats,
  error: initialError,
}: StatsViewProps) {
  const [stats, setStats] = useState<ApiPageViewStats | null>(initialStats);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [period, setPeriod] = useState<7 | 30>(30);

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

  const filteredTrend = useMemo(() => {
    const trend = stats?.dailyTrend ?? [];
    return trend.slice(-period);
  }, [stats?.dailyTrend, period]);

  const totalInPeriod = useMemo(() => {
    return filteredTrend.reduce((acc, curr) => acc + curr.count, 0);
  }, [filteredTrend]);

  const avgInPeriod = useMemo(() => {
    if (filteredTrend.length === 0) return 0;
    return Math.round(totalInPeriod / filteredTrend.length);
  }, [totalInPeriod, filteredTrend.length]);

  const header = (
    <PageHeader
      title="상세 방문 통계"
      description={`웹사이트 방문 데이터를 분석합니다.${
        lastUpdated !== null ? ` ${lastUpdated} 기준으로 10초마다 갱신됩니다.` : ""
      }`}
      actions={
        stats !== null ? (
          <SegmentedControl
            label="통계 기간"
            testIdPrefix="btn-stats-period"
            value={String(period)}
            onChange={(next) => setPeriod(next === "7" ? 7 : 30)}
            options={[
              { value: "7", label: "최근 7일" },
              { value: "30", label: "최근 30일" },
            ]}
          />
        ) : undefined
      }
    />
  );

  if (!stats) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          Icon={BarChart3Icon}
          accent="purple"
          title="통계를 불러올 수 없습니다"
          description={
            error !== null
              ? `원인: ${error}`
              : "잠시 후 자동으로 다시 시도합니다. 계속 실패하면 새로고침해 주세요."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="기간 내 총 방문"
          value={totalInPeriod.toLocaleString("ko-KR")}
          caption={`최근 ${period}일 합계`}
          Icon={CalendarIcon}
          accent="sky"
        />
        <StatTile
          label="일평균 방문"
          value={avgInPeriod.toLocaleString("ko-KR")}
          caption={`최근 ${period}일 기준`}
          Icon={BarChart3Icon}
          accent="teal"
        />
        <StatTile
          label="오늘 총 방문"
          value={stats.today.count.toLocaleString("ko-KR")}
          caption="자정부터 현재까지"
          Icon={MonitorIcon}
          accent="green"
        />
      </div>

      <Card>
        <CardHeader
          title="방문자 수 추이"
          actions={
            <span className="flex items-center gap-1.5 text-caption text-ink-muted">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />
              일별 방문자 수
            </span>
          }
        />
        <div className="mt-6">
          <PageViewChart data={filteredTrend} />
        </div>
      </Card>
    </div>
  );
}
