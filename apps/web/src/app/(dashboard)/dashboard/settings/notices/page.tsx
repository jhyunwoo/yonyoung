import NoticeManager from "../../../_components/notice-manager";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isPresidentRole } from "../../../../../lib/auth-shared";

export default async function SettingsNoticesPage() {
  const session = await serverAuthTool.requireSession();
  const noticesBasePath = "/dashboard/settings/notices";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeManager
        scope="global"
        canWrite={isPresidentRole(session.user.role)}
        heading="전체 공지"
        description="최근 공지를 확인하고 항목을 클릭해 상세 내용을 볼 수 있습니다."
        emptyMessage="등록된 전체 공지가 없습니다."
        basePath={noticesBasePath}
        createPath={`${noticesBasePath}/new`}
      />
    </main>
  );
}
