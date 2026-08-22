import Image from "next/image";
import Link from "next/link";
import { readCookieHeader } from "@/shared/http/http";
import { listAdminExhibitions } from "@/features/dashboard/services/admin-read-service";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate, formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import {
  sortExhibitionsByStartDateDesc,
  summarizeExhibitionDescription,
} from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";

type GenerationExhibitionsListProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
  canManage: boolean;
};

export default async function GenerationExhibitionsList({
  generationId,
  generationPath,
  generationName,
  canManage,
}: GenerationExhibitionsListProps) {
  const cookieHeader = await readCookieHeader();
  const result = await listAdminExhibitions(generationId, cookieHeader);
  const exhibitions = result.ok ? sortExhibitionsByStartDateDesc(result.data) : [];

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
            Exhibitions
          </p>
          <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
            {generationName} 전시 관리
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
            이 기수의 전시를 확인하고 필요할 때 새 전시를 등록할 수 있습니다.
          </p>
        </div>
        {canManage ? (
          <Link
            href={`${generationPath}/exhibitions/new`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active"
          >
            전시 추가
          </Link>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
          전시를 등록하거나 수정할 권한이 없습니다.
        </p>
      ) : null}

      {!result.ok ? (
        <AdminReadErrorNotice error={result.error} />
      ) : exhibitions.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-4 py-6 text-sm text-ink-muted">
          현재 기수에 등록된 전시가 없습니다.
        </p>
      ) : (
        <ul
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-testid="generation-exhibitions-list"
        >
          {exhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              <Link
                href={`${generationPath}/exhibitions/${exhibition.id}`}
                className="block overflow-hidden rounded-lg border border-hairline bg-surface transition hover:border-hairline-strong"
                data-testid={`generation-exhibition-card-${exhibition.id}`}
              >
                <div className="relative aspect-[4/3] w-full bg-canvas-soft">
                  <Image
                    src={exhibition.coverImageUrl}
                    alt={exhibition.title}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(exhibition.coverImageUrl)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-ink">{exhibition.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {formatKoreanDateRange(exhibition.startDate, exhibition.endDate)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">장소: {exhibition.place}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                    {summarizeExhibitionDescription(exhibition.description)}
                  </p>
                  <p className="mt-3 text-xs text-ink-muted">
                    최근 수정: {formatKoreanDate(exhibition.updatedAt)} ·{" "}
                    {formatAuditActor(exhibition.updatedBy)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
