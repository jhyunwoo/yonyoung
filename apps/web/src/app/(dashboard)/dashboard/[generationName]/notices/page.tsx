import NoticeManager from "../../../_components/notice-manager";
import { requireDashboardGeneration } from "../_lib/resolve-generation";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";

export default async function GenerationNoticesPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeManager
        scope="generation"
        generationId={generation.id}
        canWrite={isAdminRole(session.user.role)}
        heading={`${generation.name} 공지 관리`}
        description="해당 기수 전용 공지를 작성하고 수정할 수 있습니다."
        emptyMessage="등록된 기수 공지가 없습니다."
      />
    </main>
  );
}
