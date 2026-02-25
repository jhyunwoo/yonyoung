import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isAdminRole, isPresidentRole } from "../../../../../../lib/auth-shared";
import { requireDashboardGeneration } from "../../_lib/resolve-generation";
import GenerationExhibitionDetail from "../_components/generation-exhibition-detail";

export default async function GenerationExhibitionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; id: string }>;
}>) {
  const [{ id }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <GenerationExhibitionDetail
        exhibitionId={id}
        generationId={generation.id}
        generationName={generation.name}
        generationPath={generation.path}
        canManage={isAdminRole(session.user.role)}
        canDelete={isPresidentRole(session.user.role)}
      />
    </main>
  );
}
