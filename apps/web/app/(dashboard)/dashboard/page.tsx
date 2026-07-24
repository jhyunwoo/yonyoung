import { Suspense } from "react";
import { headers } from "next/headers";
import DashboardLinktreeOverview from "@/app/(dashboard)/_components/dashboard-linktree-overview";
import DashboardR2StorageUsage from "@/app/(dashboard)/_components/dashboard-r2-storage-usage";
import DashboardPageViews from "@/app/(dashboard)/_components/dashboard-page-views";
import DashboardRuntimeMeta from "@/app/(dashboard)/_components/dashboard-runtime-meta";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { Skeleton } from "@/components/ui/skeleton";

const YEONYOUNG_NAS_URL = "https://165.132.176.27:8080";

export default async function DashboardPage() {
  await serverAuthGuard.requireSession();

  const reqHeaders = await headers();
  const clientIp =
    reqHeaders.get("cf-connecting-ip") ||
    reqHeaders.get("x-real-ip") ||
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  const isInternalNetwork =
    process.env.NODE_ENV === "development" || clientIp.startsWith("165.132.");

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-2 lg:auto-rows-[minmax(8rem,auto)]">
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
                <div className="space-y-4" aria-hidden="true">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`dashboard-page-views-stat-skeleton-${index + 1}`}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="mt-2 h-7 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <DashboardPageViews />
          </Suspense>
        </div>

        <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8 lg:row-span-2">
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
          <div className="mt-auto pt-5">
            {isInternalNetwork ? (
              <a
                href={YEONYOUNG_NAS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                연영나스 바로가기
              </a>
            ) : (
              <div className="flex flex-col gap-1.5 items-start">
                <button
                  disabled
                  data-testid="dashboard-nas-internal-only-button"
                  className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                  title="연세대학교 내부망(165.132.x.x)에서만 접속할 수 있습니다."
                >
                  연세대학교 내부망에서만 접속 가능합니다
                </button>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 pl-0.5">
                  VPN을 사용하여 접속해주세요.
                </span>
              </div>
            )}
          </div>
        </aside>

        <div className="h-full lg:row-span-2">
          <Suspense
            fallback={
              <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
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
        </div>

        <div className="lg:col-span-2 lg:row-span-2">
          <Suspense
            fallback={
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
                <div className="space-y-4" aria-hidden="true">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-3 w-full max-w-xl" />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`dashboard-linktree-overview-skeleton-${index + 1}`}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="mt-4 h-12 w-full" />
                        <Skeleton className="mt-2 h-12 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            }
          >
            <DashboardLinktreeOverview />
          </Suspense>
        </div>
      </div>

      <DashboardRuntimeMeta />
    </main>
  );
}
