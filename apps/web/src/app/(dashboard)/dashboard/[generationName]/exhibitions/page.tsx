import { Suspense } from "react";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isAdminRole } from "../../../../../lib/auth-shared";
import GenerationExhibitionsList from "./_components/generation-exhibitions-list";
import { requireDashboardGeneration } from "../_lib/resolve-generation";

export default async function GenerationExhibitionsPage({
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
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm text-slate-500">전시 목록을 불러오는 중입니다...</p>
          </section>
        }
      >
        <GenerationExhibitionsList
          generationId={generation.id}
          generationPath={generation.path}
          generationName={generation.name}
          canManage={isAdminRole(session.user.role)}
        />
      </Suspense>
    </main>
  );
}
