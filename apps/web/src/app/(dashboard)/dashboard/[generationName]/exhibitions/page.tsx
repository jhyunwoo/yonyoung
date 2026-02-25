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
      <GenerationExhibitionsList
        generationId={generation.id}
        generationPath={generation.path}
        generationName={generation.name}
        canManage={isAdminRole(session.user.role)}
      />
    </main>
  );
}
