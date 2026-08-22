import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { readCookieHeader } from "@/shared/http/http";
import {
  listAdminGenerations,
  listAdminUsers,
} from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import MembersGrid from "@/app/(dashboard)/dashboard/settings/members/members-grid";

export default async function SettingsMembersPage() {
  await serverAuthGuard.requireGlobalUserManagementAccess();

  const cookieHeader = await readCookieHeader();
  const [usersResult, generationsResult] = await Promise.all([
    listAdminUsers(cookieHeader),
    listAdminGenerations(cookieHeader),
  ]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          Settings / Members
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">전체 멤버 관리</h1>
        <p className="mt-3 text-sm text-ink-muted">
          전체 멤버의 권한, 소속 기수, 기본 정보를 보고 검색과 필터로 원하는 사용자를
          빠르게 찾을 수 있으며, 여러 명을 선택해 권한을 한 번에 수정할 수 있습니다.
        </p>
        {usersResult.ok ? (
          <MembersGrid
            initialUsers={usersResult.data}
            generations={generationsResult.ok ? generationsResult.data : []}
          />
        ) : (
          <AdminReadErrorNotice error={usersResult.error} />
        )}
      </section>
    </div>
  );
}
