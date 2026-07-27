import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import MembersGrid from "@/app/(dashboard)/dashboard/[generationName]/members/members-grid";

export default async function GenerationMembersPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const generation = await requireDashboardGeneration(params);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          Members
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
          {generation.name} 멤버 관리
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          이 기수에 소속된 멤버를 확인하고 상세 정보를 볼 수 있습니다.
        </p>
        <MembersGrid generationId={generation.id} generationPath={generation.path} />
      </section>
    </div>
  );
}
