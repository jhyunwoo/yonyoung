import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { isUnverifiedRole } from "../../../../../../lib/auth-shared";
import { requireDashboardGeneration } from "../../_lib/resolve-generation";
import ActivityCreateForm from "../_components/activity-create-form";

export default async function GenerationActivityCreatePage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string }>;
}>) {
  const [generation, session] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);

  if (isUnverifiedRole(session.user.role)) {
    redirect(`${generation.path}/activities`);
  }

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <ActivityCreateForm
        generationId={generation.id}
        generationPath={generation.path}
        generationName={generation.name}
      />
    </main>
  );
}
