import Link from "next/link";
import type { ApiActivity } from "@yonyoung/contracts";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import DetailImageGrid from "@/app/(dashboard)/_components/media/detail-image-grid";
import ActivityDeleteButton from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-delete-button";

type GenerationActivityDetailProps = {
  activity: ApiActivity;
  generationName: string;
  generationPath: string;
  canManage: boolean;
  canDelete: boolean;
};

export default function GenerationActivityDetail({
  activity,
  generationName,
  generationPath,
  canManage,
  canDelete,
}: GenerationActivityDetailProps) {
  return (
    <section className="mx-auto w-full max-w-5xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Activities
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
            {generationName} 활동 상세
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            활동 내용과 사진을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Link
              href={`${generationPath}/activities/${activity.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active"
            >
              수정
            </Link>
          ) : null}
          {canDelete ? (
            <ActivityDeleteButton
              activityId={activity.id}
              generationPath={generationPath}
            />
          ) : null}
          <Link
            href={`${generationPath}/activities`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            목록으로
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-hairline p-4">
          <p className="text-xl font-semibold text-ink">{activity.title}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {formatKoreanDateRange(activity.startDate, activity.endDate)}
          </p>
          <div className="mt-3">
            <RichTextContent html={activity.description} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            생성일: {formatKoreanDate(activity.createdAt)}
          </p>
          <LastUpdatedMeta
            updatedAt={activity.updatedAt}
            updatedBy={activity.updatedBy}
            className="mt-1 text-xs text-ink-muted"
          />
        </div>

        <DetailImageGrid
          resourceId={activity.id}
          title={activity.title}
          coverImageUrl={activity.coverImageUrl}
          detailImages={activity.detailImages}
        />
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="activity" resourceId={activity.id} />
      </div>
    </section>
  );
}
