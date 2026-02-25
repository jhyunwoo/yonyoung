import NoticeDetail from "../../../../_components/notice-detail";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isPresidentRole } from "../../../../../../lib/auth-shared";

export default async function SettingsNoticeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ noticeId: string }>;
}>) {
  const [{ noticeId }, session] = await Promise.all([
    params,
    serverAuthTool.requireSession(),
  ]);
  const noticesBasePath = "/dashboard/settings/notices";
  const detailPath = `${noticesBasePath}/${noticeId}`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeDetail
        scope="global"
        noticeId={noticeId}
        canWrite={isPresidentRole(session.user.role)}
        listPath={noticesBasePath}
        editPath={`${detailPath}/edit`}
        allowInlineEdit={false}
        heading="전체 공지 상세"
        description="공지 내용을 확인하고, 필요한 경우 수정 페이지에서 변경하거나 삭제할 수 있습니다."
      />
    </main>
  );
}
