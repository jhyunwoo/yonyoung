import Link from "next/link";
import type { ApiExhibition } from "@yonyoung/contracts";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import DetailImageGrid from "@/app/(dashboard)/_components/media/detail-image-grid";
import ExhibitionDeleteButton from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-delete-button";

type GenerationExhibitionDetailProps = {
  exhibition: ApiExhibition;
  generationName: string;
  generationPath: string;
  canManage: boolean;
  canDelete: boolean;
};

export default function GenerationExhibitionDetail({
  exhibition,
  generationName,
  generationPath,
  canManage,
  canDelete,
}: GenerationExhibitionDetailProps) {
  return (
    <section className="mx-auto w-full max-w-5xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Exhibitions
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
            {generationName} 전시 상세
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            전시 정보와 사진을 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Link
              href={`${generationPath}/exhibitions/${exhibition.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active"
            >
              수정
            </Link>
          ) : null}
          {canDelete ? (
            <ExhibitionDeleteButton
              exhibitionId={exhibition.id}
              generationPath={generationPath}
            />
          ) : null}
          <Link
            href={`${generationPath}/exhibitions`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            목록으로
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-hairline p-4">
          <p className="text-xl font-semibold text-ink">{exhibition.title}</p>
          <p className="mt-2 text-sm text-ink-muted">
            {formatKoreanDateRange(exhibition.startDate, exhibition.endDate)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">장소: {exhibition.place}</p>
          {exhibition.placeAddress ? (
            <p className="mt-1 text-sm text-ink-muted">주소: {exhibition.placeAddress}</p>
          ) : null}
          <div className="mt-3">
            <RichTextContent html={exhibition.description} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            생성일: {formatKoreanDate(exhibition.createdAt)}
          </p>
          <LastUpdatedMeta
            updatedAt={exhibition.updatedAt}
            updatedBy={exhibition.updatedBy}
            className="mt-1 text-xs text-ink-muted"
          />
        </div>

        <DetailImageGrid
          resourceId={exhibition.id}
          title={exhibition.title}
          coverImageUrl={exhibition.coverImageUrl}
          detailImages={exhibition.detailImages}
        />
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="exhibition" resourceId={exhibition.id} />
      </div>
    </section>
  );
}
