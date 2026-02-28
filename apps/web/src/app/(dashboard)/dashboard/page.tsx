import { Suspense } from "react";
import RecentGlobalNotices from "../_components/recent-global-notices";
import DashboardR2StorageUsage from "../_components/dashboard-r2-storage-usage";
import { serverAuthTool } from "../../../lib/auth-server-tool";

const YEONYOUNG_NAS_URL = "https://165.132.176.27:8080";

export default async function DashboardPage() {
  await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Welcome
          </p>
          <h2 className="mt-3 text-xl font-bold text-slate-900">
            연영회에 오신 것을 환영합니다.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            왼쪽 메뉴에서 관리할 기수를 선택하면 공지, 활동, 전시 관리를 바로 시작할 수 있습니다.
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm text-slate-500">파일 저장공간 사용량을 불러오는 중입니다...</p>
            </section>
          }
        >
          <DashboardR2StorageUsage />
        </Suspense>

        <Suspense
          fallback={
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <p className="text-sm text-slate-500">최근 전체 공지를 불러오는 중입니다...</p>
            </section>
          }
        >
          <RecentGlobalNotices />
        </Suspense>
      </div>
    </main>
  );
}
