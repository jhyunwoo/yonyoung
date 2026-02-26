import { Suspense } from "react";
import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import { isUnverifiedRole } from "../../../../../lib/auth-shared";
import GenerationActivitiesList from "./_components/generation-activities-list";
import { requireDashboardGeneration } from "../_lib/resolve-generation";

export default async function GenerationActivitiesPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);
  const canManage = !isUnverifiedRole(session.user.role);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm text-slate-500">활동 목록을 불러오는 중입니다...</p>
          </section>
        }
      >
        <GenerationActivitiesList
          generationId={generation.id}
          generationPath={generation.path}
          generationName={generation.name}
          canManage={canManage}
        />
      </Suspense>
    </main>
  );
}
