import NoticeCreateForm from "../../../../_components/notice-create-form";
import { requireDashboardGeneration } from "../../_lib/resolve-generation";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../../lib/auth-shared";

export default async function GenerationNoticeCreatePage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);
  const noticesBasePath = `${generation.path}/notices`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <NoticeCreateForm
        scope="generation"
        generationId={generation.id}
        canWrite={isAdminRole(session.user.role)}
        basePath={noticesBasePath}
        listPath={noticesBasePath}
        heading={`${generation.name} 공지 작성`}
        description="새 공지를 작성하면 상세 페이지로 이동합니다."
      />
    </main>
  );
}
