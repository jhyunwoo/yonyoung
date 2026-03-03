import { Suspense } from "react";
import RecentGlobalNotices from "@/app/(dashboard)/_components/recent-global-notices";
import DashboardR2StorageUsage from "@/app/(dashboard)/_components/dashboard-r2-storage-usage";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

const YEONYOUNG_NAS_URL = "https://165.132.176.27:8080";

export default async function DashboardPage() {
  await serverAuthGuard.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <aside className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-600 dark:text-slate-300 uppercase">
            Welcome
          </p>
          <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-50">
            연영회에 오신 것을 환영합니다.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            왼쪽 메뉴에서 관리할 기수를 선택하면 공지, 활동, 전시 관리를 바로 시작할 수
            있습니다.
          </p>
          <div className="mt-5">
            <a
              href={YEONYOUNG_NAS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              연영나스 바로가기
            </a>
          </div>
        </aside>

        <Suspense
          fallback={
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
              <div className="space-y-3" aria-hidden="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-2 w-full max-w-lg" />
              </div>
            </section>
          }
        >
          <DashboardR2StorageUsage />
        </Suspense>

        <Suspense
          fallback={
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm md:p-8">
              <div className="space-y-3" aria-hidden="true">
                <Skeleton className="h-4 w-40" />
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`dashboard-global-notice-skeleton-${index + 1}`}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-1 h-3 w-1/3" />
                  </div>
                ))}
              </div>
            </section>
          }
        >
          <RecentGlobalNotices />
        </Suspense>
      </div>
    </main>
  );
}
