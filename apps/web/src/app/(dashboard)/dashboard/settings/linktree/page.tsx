import { Suspense } from "react";
import LinktreeManager from "../../../_components/linktree-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function SettingsLinktreePage() {
  const session = await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm text-slate-500">링크 모음 목록을 불러오는 중입니다...</p>
          </section>
        }
      >
        <LinktreeManager
          canWrite={isAdminRole(session.user.role)}
          basePath="/dashboard/settings/linktree"
        />
      </Suspense>
    </main>
  );
}
