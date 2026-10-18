import { notFound, redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { getAdminActivityById } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import {
  resolveInitialNoticeMessage,
  type SearchParams,
} from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-initial-notice-message";
import ActivityEditForm from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-edit-form";
import AttachmentManager from "@/app/(dashboard)/_components/attachment-manager";

export default async function GenerationActivityEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ generationName: string; activityId: string }>;
  searchParams: SearchParams;
}>) {
  // 수정할 항목 읽기는 경로 값만 있으면 되므로 기수·세션 확인과 동시에 시작한다.
  const [{ activityId }, generation, session, initialMessage, activityResult] =
    await Promise.all([
      params,
      requireDashboardGeneration(params),
      serverAuthGuard.requireSession(),
      resolveInitialNoticeMessage(searchParams, "활동은"),
      params.then((routeParams) => getAdminActivityById(routeParams.activityId)),
    ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/activities/${activityId}`);
  }

  if (!activityResult.ok && activityResult.error.reason === "not_found") {
    notFound();
  }

  // 다른 기수의 활동을 이 기수 경로로 열었으면 목록으로 되돌린다.
  if (activityResult.ok && activityResult.data.generationId !== generation.id) {
    redirect(`${generation.path}/activities`);
  }

  return (
    <div className="space-y-8 px-4 py-6 md:px-8 md:py-8">
      {activityResult.ok ? (
        <ActivityEditForm
          activity={activityResult.data}
          generationId={generation.id}
          generationName={generation.name}
          generationPath={generation.path}
          initialMessage={initialMessage}
        />
      ) : (
        <AdminReadErrorNotice error={activityResult.error} />
      )}

      {/* 활동 상세 페이지에 공개되는 첨부 자료 (회계 파일, 월간연영회 PDF 등) */}
      <section className="mx-auto w-full max-w-5xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          Activity Files
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink md:text-2xl">활동 첨부 자료</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          이 활동 페이지에 공개할 자료(PDF, 문서 등)를 첨부할 수 있습니다. 방문자 누구나
          다운로드할 수 있습니다.
        </p>
        <div className="mt-6">
          <AttachmentManager scope="activity" resourceId={activityId} />
        </div>
      </section>
    </div>
  );
}
