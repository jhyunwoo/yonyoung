import { notFound, redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getAdminExhibitionById } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { isAdminRole, isPresidentRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import GenerationExhibitionDetail from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/generation-exhibition-detail";

export default async function GenerationExhibitionDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; id: string }>;
}>) {
  const [generation, session, exhibitionResult] = await Promise.all([
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
    params.then(({ id }) => getAdminExhibitionById(id)),
  ]);

  if (!exhibitionResult.ok && exhibitionResult.error.reason === "not_found") {
    notFound();
  }

  // 다른 기수의 전시를 이 기수 경로로 열었으면 목록으로 되돌린다.
  if (exhibitionResult.ok && exhibitionResult.data.generationId !== generation.id) {
    redirect(`${generation.path}/exhibitions`);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {exhibitionResult.ok ? (
        <GenerationExhibitionDetail
          exhibition={exhibitionResult.data}
          generationName={generation.name}
          generationPath={generation.path}
          canManage={isAdminRole(session.user.role)}
          canDelete={isPresidentRole(session.user.role)}
        />
      ) : (
        <AdminReadErrorNotice error={exhibitionResult.error} />
      )}
    </div>
  );
}
