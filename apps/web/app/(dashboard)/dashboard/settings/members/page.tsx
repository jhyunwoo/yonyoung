import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import MembersGrid from "@/app/(dashboard)/dashboard/settings/members/members-grid";

export default async function SettingsMembersPage() {
  await serverAuthTool.requireGlobalUserManagementAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Settings / Members</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">전체 멤버 관리</h1>
        <p className="mt-3 text-sm text-slate-600">
          전체 멤버를 한눈에 확인하고, 상세 화면에서 정보를 수정할 수 있습니다.
        </p>
        <MembersGrid />
      </section>
    </main>
  );
}
