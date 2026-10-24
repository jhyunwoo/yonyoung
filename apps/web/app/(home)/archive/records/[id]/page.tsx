import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Suspense } from "react";
import {
  getPublicActivityById,
  getPublicAttachments,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata, resolveSiteUrl } from "@/features/seo/metadata/seo";
import JsonLd from "@/features/seo/structured-data/json-ld";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdImages,
  buildOrganizationRef,
  buildWebsiteId,
} from "@/features/seo/structured-data/schema-builders";
import PageViewTracker from "@/app/_components/page-view-tracker";
import ArchiveDetailSkeleton from "@/app/(home)/_components/archive-detail-skeleton";
import {
  PhotoGallery,
  toDetailGalleryItems,
} from "@/app/(home)/_components/photo-gallery";
import { AttachmentList } from "@/app/(home)/_components/attachment-list";

// 공개된 활동 전부를 빌드 시점에 굽는다. 목록에 없는 id는 App Shell을 받은 뒤
// 첫 방문에서 백그라운드로 채워져 캐시에 올라간다.
export { generateActivityStaticParams as generateStaticParams } from "@/features/public/services/public-static-params";

type RecordDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getActivity = cache(async (id: string) => {
  return getPublicActivityById(id).catch(() => null);
});

const buildActivityDescription = (description: string, title: string): string => {
  const summary = summarizeRichTextHtml(description, 145);
  const context = `연세대학교 중앙사진동아리 연영회의 ${title} 활동 사진과 기록을 확인하세요.`;
  // "61기 OT" 같은 한 줄 본문만 쓰면 검색 결과 설명에 누가·무엇인지가 빠진다.
  return summary.length < 50 ? `${summary} ${context}`.trim() : summary;
};

export async function generateMetadata({
  params,
}: RecordDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const activity = await getActivity(id);

  if (!activity) {
    notFound();
  }

  return createPageMetadata({
    title: `${activity.title} | 연영회 활동 기록`,
    description: buildActivityDescription(activity.description, activity.title),
    path: `/archive/records/${activity.id}`,
    type: "article",
    keywords: [
      activity.title,
      "연영회 활동",
      "연세대학교 사진동아리",
      "사진 동아리 활동 기록",
    ],
  });
}

/**
 * id에 의존하는 모든 것을 담는다.
 *
 * `await params`가 이 컴포넌트 안에서 일어나야 `generateStaticParams`에 없는 id로
 * 들어와도 바깥 프레임이 App Shell로 먼저 나갈 수 있다 (params를 페이지 최상단에서
 * await하면 셸이 특정 URL에 묶여 버린다).
 */
async function RecordDetailContent({ params }: RecordDetailPageProps) {
  const { id } = await params;
  // 활동 정보와 첨부 자료는 독립적이므로 병렬로 조회한다
  const [activity, attachments] = await Promise.all([
    getActivity(id),
    getPublicAttachments("activity", id),
  ]);

  if (!activity) {
    notFound();
  }

  const siteUrl = resolveSiteUrl();
  const pageUrl = `${siteUrl}/archive/records/${activity.id}`;
  const description = buildActivityDescription(activity.description, activity.title);
  const activityJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    mainEntityOfPage: pageUrl,
    isPartOf: { "@id": buildWebsiteId(siteUrl) },
    headline: activity.title,
    description,
    image: buildJsonLdImages(activity.coverImageUrl, activity.detailImages),
    datePublished: new Date(activity.createdAt).toISOString(),
    dateModified: new Date(activity.updatedAt).toISOString(),
    inLanguage: "ko-KR",
    author: buildOrganizationRef(siteUrl),
    publisher: {
      ...buildOrganizationRef(siteUrl),
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/android-chrome-512x512.png`,
      },
    },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", url: siteUrl },
    { name: "활동 기록", url: `${siteUrl}/archive/records` },
    { name: activity.title, url: pageUrl },
  ]);

  return (
    <>
      <PageViewTracker pageType="activity" resourceId={id} />
      <JsonLd data={activityJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <header className="mb-8">
        <h1 className="m-0 text-[1.7rem] font-bold text-(--text-primary) md:text-[2rem]">
          {activity.title}
        </h1>
        <p className="mb-0 mt-3 text-[0.95rem] text-(--text-muted)">
          {formatKoreanDateRange(activity.startDate, activity.endDate)}
        </p>
        <RichTextContent
          html={activity.description}
          className="record-description mb-0 mt-3 leading-[1.6]"
        />
      </header>

      <PhotoGallery
        items={toDetailGalleryItems(activity)}
        fallbackAspect={4 / 3}
        refAspect={1.5}
        data-testid="record-detail-gallery"
      />

      {attachments.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 text-[1.2rem] font-bold text-(--text-primary)">
            첨부 자료
          </h2>
          <AttachmentList
            attachments={attachments}
            data-testid="record-attachment-list"
          />
        </section>
      ) : null}
    </>
  );
}

/**
 * Instant Navigation 계약 (Next.js 16.3).
 *
 * 이 라우트로 이동할 때 요청 시점 작업을 기다리지 않고 곧바로 의미 있는 UI 가
 * 나와야 한다는 선언이다. 빌드가 이를 검증하므로, 나중에 누군가 이 트리 위쪽에서
 * `cookies()` · `headers()` · `await params` · 캐시되지 않은 fetch 를 하면 빌드가
 * 깨진다 — 성능 회귀가 리뷰가 아니라 CI 에서 잡힌다.
 */
export const instant = true;

export default function RecordDetailPage({ params }: RecordDetailPageProps) {
  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <Link
          href="/archive/records"
          className="mb-4 inline-flex min-h-11 items-center text-[0.9rem] text-(--text-primary) no-underline hover:underline"
        >
          활동 기록으로 돌아가기
        </Link>

        <Suspense
          fallback={
            <ArchiveDetailSkeleton
              tileAspect="aspect-[4/3]"
              data-testid="record-detail-skeleton"
            />
          }
        >
          <RecordDetailContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}
