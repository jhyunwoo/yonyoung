import NoticeCreateForm from "../../../../_components/notice-create-form";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isPresidentRole } from "../../../../../../lib/auth-shared";

export default async function SettingsNoticeCreatePage() {
  const session = await serverAuthTool.requireSession();
  const noticesBasePath = "/dashboard/settings/notices";

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeCreateForm
        scope="global"
        canWrite={isPresidentRole(session.user.role)}
        basePath={noticesBasePath}
        listPath={noticesBasePath}
        heading="전체 공지 작성"
        description="새 전체 공지를 작성하면 상세 페이지로 이동합니다."
      />
    </main>
  );
}
