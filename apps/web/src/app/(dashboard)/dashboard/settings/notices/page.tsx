import NoticeManager from "../../../_components/notice-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function SettingsNoticesPage() {
  const session = await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeManager
        scope="global"
        canWrite={isAdminRole(session.user.role)}
        heading="전체 공지 관리"
        description="모든 기수에 공통으로 노출되는 전체 공지를 관리합니다."
        emptyMessage="등록된 전체 공지가 없습니다."
      />
    </main>
  );
}
