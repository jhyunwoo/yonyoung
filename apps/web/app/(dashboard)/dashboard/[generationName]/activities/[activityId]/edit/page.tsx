import { notFound, redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { readCookieHeader } from "@/shared/http/http";
import { getAdminActivityById } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { requireDashboardGeneration } from "@/app/(dashboard)/dashboard/[generationName]/_lib/resolve-generation";
import ActivityEditForm from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-edit-form";
import AttachmentManager from "@/app/(dashboard)/_components/attachment-manager";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const resolveInitialNoticeMessage = async (
  searchParams: SearchParams,
): Promise<string | null> => {
  const params = await searchParams;
  if (params.error !== "detail-upload-failed") {
    return null;
  }

  const messageParam = params.message;
  if (typeof messageParam === "string" && messageParam.trim().length > 0) {
    return `활동은 생성되었지만 일부 세부 이미지 업로드에 실패했습니다: ${messageParam}`;
  }

  return "활동은 생성되었지만 일부 세부 이미지 업로드에 실패했습니다. 이미지 업로드를 다시 시도해 주세요.";
};

export default async function GenerationActivityEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ generationName: string; activityId: string }>;
  searchParams: SearchParams;
}>) {
  const [{ activityId }, generation, session, initialMessage] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthGuard.requireSession(),
    resolveInitialNoticeMessage(searchParams),
  ]);

  if (!isAdminRole(session.user.role)) {
    redirect(`${generation.path}/activities/${activityId}`);
  }

  const activityResult = await getAdminActivityById(activityId, await readCookieHeader());

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
