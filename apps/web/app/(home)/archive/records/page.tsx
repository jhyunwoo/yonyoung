import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  listPublicActivities,
  safeList,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import PageTitleHero from "@/app/(home)/_components/page-title-hero";
import ArchiveViewCounts, {
  ArchiveViewCountsProvider,
} from "@/app/(home)/_components/archive-view-counts";

export const metadata: Metadata = createPageMetadata(PAGE_SEO.archiveRecords);

const getArchiveRecords = async () => {
  return safeList(listPublicActivities, []);
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

export default async function ArchiveRecordsPage() {
  const activities = await getArchiveRecords();
  const activityIds = activities.map((a) => a.id);

  return (
    <div className="min-h-screen bg-(--bg-primary)">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="활동 기록"
          description="출사와 프로젝트, 교류 활동을 사진과 함께 기록합니다."
        />
      </div>

      <div className="pb-16">
        {activities.length === 0 ? (
          <div className="mx-auto max-w-[1400px] px-4 md:px-8">
            <p className="text-center text-base text-(--text-muted)">준비 중입니다.</p>
          </div>
        ) : (
          <ArchiveViewCountsProvider resourceType="activity" resourceIds={activityIds}>
            <div
              className="mx-auto grid max-w-[1400px] [grid-template-columns:repeat(4,minmax(0,1fr))] gap-6 px-4 md:px-8 max-[1024px]:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))] max-[768px]:grid-cols-1 max-[768px]:gap-3"
              data-testid="archive-records-grid"
            >
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/archive/records/${activity.id}`}
                  className="group relative block aspect-[4/3] cursor-pointer overflow-hidden bg-(--surface-border) transition-transform duration-300 hover:scale-[1.02]"
                  data-testid={`archive-record-card-${activity.id}`}
                  aria-label={`${activity.title} 상세 보기`}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={activity.coverImageUrl}
                      alt={activity.title}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(0,0,0,0.7)] to-transparent p-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[768px]:opacity-100 md:p-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="m-0 text-[0.9rem] leading-[1.4] font-semibold text-white md:text-[1.1rem] truncate">
                          {activity.title}
                        </h3>
                        <ArchiveViewCounts
                          resourceId={activity.id}
                          className="shrink-0"
                        />
                      </div>
                      <span className="text-[0.85rem] opacity-80">
                        {formatKoreanDateRange(activity.startDate, activity.endDate)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </ArchiveViewCountsProvider>
        )}
      </div>
    </div>
  );
}
