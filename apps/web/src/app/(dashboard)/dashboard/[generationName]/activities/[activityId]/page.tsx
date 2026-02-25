import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isUnverifiedRole } from "../../../../../../lib/auth-shared";
import { requireDashboardGeneration } from "../../_lib/resolve-generation";
import GenerationActivityDetail from "../_components/generation-activity-detail";

export default async function GenerationActivityDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; activityId: string }>;
}>) {
  const [{ activityId }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <GenerationActivityDetail
        activityId={activityId}
        generationId={generation.id}
        generationName={generation.name}
        generationPath={generation.path}
        canManage={!isUnverifiedRole(session.user.role)}
      />
    </main>
  );
}
