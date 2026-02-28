import { Suspense } from "react";
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
  const noticesBasePath = `${generation.path}/notices`;

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm text-slate-500">공지 목록을 불러오는 중입니다...</p>
          </section>
        }
      >
        <NoticeManager
          scope="generation"
          generationId={generation.id}
          canWrite={isAdminRole(session.user.role)}
          heading={`${generation.name} 공지`}
          description="최근 공지를 확인하고 제목을 눌러 자세한 내용을 볼 수 있습니다."
          emptyMessage="등록된 기수 공지가 없습니다."
          basePath={noticesBasePath}
          createPath={`${noticesBasePath}/new`}
        />
      </Suspense>
    </main>
  );
}
