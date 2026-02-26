import Link from "next/link";
import { serverAuthTool } from "../../../lib/auth-server-tool";

export default async function DashboardPage() {
  await serverAuthTool.requireSession();
  const noticesBasePath = "/dashboard/settings/notices";

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
            사이드바에서 원하는 기수를 선택해 내부 관리 작업을 시작해 주세요.
          </p>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Notices
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">공지 관리</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            공지 목록 확인과 작성/수정은 공지 관리 화면에서 진행할 수 있습니다.
          </p>
          <div className="mt-5">
            <Link
              href={noticesBasePath}
              className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              공지 관리 페이지로 이동
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
