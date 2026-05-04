import { getCachedPageViewStats } from "@/features/dashboard/cache/admin-dashboard-cache";
import { readCookieHeader } from "@/shared/http/http";
import type { ApiPageViewStats } from "@/shared/contracts/api-contracts";

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  return value.toLocaleString("ko-KR");
};

type StatCardProps = {
  label: string;
  value: number;
};

const StatCard = ({ label, value }: StatCardProps) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
      {label}
    </p>
    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
      {formatNumber(value)}
    </p>
  </div>
);

type RankingListProps = {
  title: string;
  items: Array<{ resourceId: string; count: number }>;
  emptyLabel: string;
};

const RankingList = ({ title, items, emptyLabel }: RankingListProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
      {title}
    </h3>
    {items.length === 0 ? (
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {emptyLabel}
      </p>
    ) : (
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={`${title}-${item.resourceId}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                {index + 1}
              </span>
              <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                {item.resourceId}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-slate-900 dark:text-slate-50">
              {formatNumber(item.count)}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

type DashboardPageViewsCardProps = {
  stats: ApiPageViewStats | null;
};

const DashboardPageViewsCard = ({ stats }: DashboardPageViewsCardProps) => {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          방문 통계
        </h2>
        {stats ? (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            최근 30일 추세 포함
          </span>
        ) : null}
      </div>

      {!stats ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          방문 통계를 불러오지 못했습니다.
        </p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="전체" value={stats.totalViews} />
            <StatCard label="홈" value={stats.homeViews} />
            <StatCard label="활동" value={stats.activityViews} />
            <StatCard label="전시" value={stats.exhibitionViews} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <RankingList
              title="인기 활동 TOP 10"
              items={stats.topActivities}
              emptyLabel="아직 기록된 활동 방문이 없습니다."
            />
            <RankingList
              title="인기 전시 TOP 10"
              items={stats.topExhibitions}
              emptyLabel="아직 기록된 전시 방문이 없습니다."
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default async function DashboardPageViews() {
  const cookieHeader = await readCookieHeader();
  const stats = await getCachedPageViewStats(cookieHeader);
  return <DashboardPageViewsCard stats={stats} />;
}
