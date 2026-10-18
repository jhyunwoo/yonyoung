import { notFound, redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getAdminExhibitionById } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import {
  resolveInitialNoticeMessage,
  type SearchParams,
} from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-initial-notice-message";
import ExhibitionEditForm from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-edit-form";

export default async function GenerationExhibitionEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ generationName: string; id: string }>;
  searchParams: SearchParams;
}>) {
  const [{ id }, generation, session, initialMessage] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
    resolveInitialNoticeMessage(searchParams, "전시는"),
  ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/exhibitions/${id}`);
  }

  const exhibitionResult = await getAdminExhibitionById(id);

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
        <ExhibitionEditForm
          exhibition={exhibitionResult.data}
          generationId={generation.id}
          generationName={generation.name}
          generationPath={generation.path}
          initialMessage={initialMessage}
        />
      ) : (
        <AdminReadErrorNotice error={exhibitionResult.error} />
      )}
    </div>
  );
}
