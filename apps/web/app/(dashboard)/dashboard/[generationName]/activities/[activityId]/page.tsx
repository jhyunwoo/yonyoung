import { notFound, redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getAdminActivityById } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import GenerationActivityDetail from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/generation-activity-detail";

export default async function GenerationActivityDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; activityId: string }>;
}>) {
  const [generation, session, activityResult] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
    params.then(({ activityId }) => getAdminActivityById(activityId)),
  ]);

  if (!activityResult.ok && activityResult.error.reason === "not_found") {
    notFound();
  }

  // 다른 기수의 활동을 이 기수 경로로 열었으면 목록으로 되돌린다.
  if (activityResult.ok && activityResult.data.generationId !== generation.id) {
    redirect(`${generation.path}/activities`);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {activityResult.ok ? (
        <GenerationActivityDetail
          activity={activityResult.data}
          generationName={generation.name}
          generationPath={generation.path}
          canManage={isAdminRole(session.user.role)}
          canDelete={isAdminRole(session.user.role)}
        />
      ) : (
        <AdminReadErrorNotice error={activityResult.error} />
      )}
    </div>
  );
}
