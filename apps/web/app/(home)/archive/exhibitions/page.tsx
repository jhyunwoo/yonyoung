import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  listPublicExhibitions,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";
import ArchiveViewCounts, {
  ArchiveViewCountsProvider,
} from "@/app/(home)/_components/archive-view-counts";

export const metadata: Metadata = createPageMetadata(PAGE_SEO.archiveExhibitions);

const getArchiveExhibitions = async () => {
  return safeList(listPublicExhibitions, []);
};

/**
 * Instant Navigation 계약 (Next.js 16.3).
 *
 * 이 라우트로 이동할 때 요청 시점 작업을 기다리지 않고 곧바로 의미 있는 UI 가
 * 나와야 한다는 선언이다. 빌드가 이를 검증하므로, 나중에 누군가 이 트리 위쪽에서
 * `cookies()` · `headers()` · `await params` · 캐시되지 않은 fetch 를 하면 빌드가
 * 깨진다 — 성능 회귀가 리뷰가 아니라 CI 에서 잡힌다.
 */
export const instant = true;

export default async function ArchiveExhibitionsPage() {
  const exhibitions = await getArchiveExhibitions();
  const exhibitionIds = exhibitions.map((e) => e.id);

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="전시회"
          description="정기 사진전과 신인 사진전, 보도 사진전의 기록을 소개합니다."
        />
      </div>

      <div className="pb-16">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          {exhibitions.length === 0 ? (
            <div className="py-16 text-center text-(--text-muted)">
              <p>전시 정보가 없습니다.</p>
            </div>
          ) : (
            <ArchiveViewCountsProvider
              resourceType="exhibition"
              resourceIds={exhibitionIds}
            >
              <section
                className="mx-auto grid max-w-[1060px] grid-cols-3 gap-10 px-8 max-[768px]:max-w-[400px] max-[768px]:grid-cols-1 max-[768px]:gap-8 max-[768px]:px-6"
                data-testid="archive-exhibitions-grid"
              >
                {exhibitions.map((exhibition) => (
                  <Link
                    key={exhibition.id}
                    href={`/archive/exhibitions/${exhibition.id}`}
                    className="group relative block aspect-[2/3] w-full cursor-pointer overflow-hidden bg-black shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-[translate,box-shadow] duration-300 motion-reduce:transition-none hover:-translate-y-[5px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)]"
                    data-testid={`archive-exhibition-card-${exhibition.id}`}
                    aria-label={`${exhibition.title} 상세 보기`}
                  >
                    <div className="absolute inset-0">
                      <Image
                        src={exhibition.coverImageUrl}
                        alt={exhibition.title}
                        fill
                        unoptimized={shouldUseUnoptimizedImage(exhibition.coverImageUrl)}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute top-4 right-4 z-[3] opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[768px]:opacity-100">
                      <ArchiveViewCounts
                        resourceId={exhibition.id}
                        className="rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-[2] flex min-h-1/2 flex-col justify-end bg-gradient-to-t from-[rgba(0,0,0,0.9)] via-[rgba(0,0,0,0.6)] to-transparent px-6 pb-6 pt-12 text-white">
                      <h2 className="mb-2 text-[1.15rem] leading-[1.3] text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                        {exhibition.title}
                      </h2>
                      <p className="mb-1 text-[0.9rem] font-semibold text-[rgba(255,255,255,0.95)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        {formatKoreanDateCompact(exhibition.startDate)} ~{" "}
                        {formatKoreanDateCompact(exhibition.endDate)}
                      </p>
                      <p className="mb-0 text-[0.85rem] text-[rgba(255,255,255,0.85)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        {exhibition.place}
                      </p>
                    </div>
                  </Link>
                ))}
              </section>
            </ArchiveViewCountsProvider>
          )}
        </div>
      </div>
    </div>
  );
}
