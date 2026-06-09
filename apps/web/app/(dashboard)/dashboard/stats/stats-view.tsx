"use client";

import { useState, useMemo } from "react";
import type { ApiPageViewStats } from "@/shared/contracts/api-contracts";
import PageViewChart from "@/app/(dashboard)/_components/dashboard-page-views-chart";
import { BarChart3Icon, CalendarIcon, MonitorIcon } from "lucide-react";

type StatsViewProps = {
  stats: ApiPageViewStats | null;
};

export default function StatsView({ stats }: StatsViewProps) {
  const [period, setPeriod] = useState<7 | 30>(30);

  const trend = stats?.dailyTrend ?? [];
  const filteredTrend = useMemo(() => {
    return trend.slice(-period);
  }, [trend, period]);

  const totalInPeriod = useMemo(() => {
    return filteredTrend.reduce((acc, curr) => acc + curr.count, 0);
  }, [filteredTrend]);

  const avgInPeriod = useMemo(() => {
    if (filteredTrend.length === 0) return 0;
    return Math.round(totalInPeriod / filteredTrend.length);
  }, [totalInPeriod, filteredTrend.length]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:text-slate-400">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            상세 방문 통계
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            웹사이트 방문 데이터를 분석합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            data-testid="btn-stats-period-7"
            onClick={() => setPeriod(7)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              period === 7
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            최근 7일
          </button>
          <button
            data-testid="btn-stats-period-30"
            onClick={() => setPeriod(30)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              period === 30
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            최근 30일
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              기간 내 총 방문
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {totalInPeriod.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <BarChart3Icon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              일평균 방문
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {avgInPeriod.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <MonitorIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              오늘 총 방문
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {stats.today.count.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            방문자 수 추이
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-50" />
            <span>Daily View Count</span>
          </div>
        </div>
        <PageViewChart data={filteredTrend} />
      </div>
    </div>
  );
}
