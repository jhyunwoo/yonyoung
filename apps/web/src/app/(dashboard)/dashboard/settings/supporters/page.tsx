import { Suspense } from "react";
import SupporterManager from "../../../_components/supporter-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function SettingsSupportersPage() {
  const session = await serverAuthTool.requireSession();
  const supportersBasePath = "/dashboard/settings/supporters";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm text-slate-500">후원사 목록을 불러오는 중입니다...</p>
          </section>
        }
      >
        <SupporterManager
          canWrite={isAdminRole(session.user.role)}
          basePath={supportersBasePath}
        />
      </Suspense>
    </main>
  );
}
