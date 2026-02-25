import NoticeManager from "../_components/notice-manager";
import { serverAuthTool } from "../../../lib/auth-server-tool";
import { isPresidentRole } from "../../../lib/auth-shared";

export default async function DashboardPage() {
  const session = await serverAuthTool.requireSession();
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

        <NoticeManager
          scope="global"
          canWrite={isPresidentRole(session.user.role)}
          heading="전체 공지"
          description="최근 공지를 확인하고 항목을 클릭해 상세 내용을 볼 수 있습니다."
          emptyMessage="등록된 전체 공지가 없습니다."
          basePath={noticesBasePath}
          createPath={`${noticesBasePath}/new`}
        />
      </div>
    </main>
  );
}
