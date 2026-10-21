import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Suspense } from "react";
import { getPublicExhibitionById } from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata, resolveSiteUrl } from "@/features/seo/metadata/seo";
import JsonLd from "@/features/seo/structured-data/json-ld";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdImages,
  buildOrganizationRef,
} from "@/features/seo/structured-data/schema-builders";
import PageViewTracker from "@/app/_components/page-view-tracker";
import ArchiveDetailSkeleton from "@/app/(home)/_components/archive-detail-skeleton";
import {
  PhotoGallery,
  toDetailGalleryItems,
} from "@/app/(home)/_components/photo-gallery";

// 공개된 전시 전부를 빌드 시점에 굽는다. 목록에 없는 id는 App Shell을 받은 뒤
// 첫 방문에서 백그라운드로 채워져 캐시에 올라간다.
export { generateExhibitionStaticParams as generateStaticParams } from "@/features/public/services/public-static-params";

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getExhibition = cache(async (id: string) => {
  return getPublicExhibitionById(id).catch(() => null);
});

const koreanIsoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

const formatKoreanIsoDate = (timestampMs: number): string => {
  return koreanIsoDateFormatter.format(timestampMs);
};

const buildExhibitionDescription = (
  description: string,
  title: string,
  place: string,
): string => {
  return (
    summarizeRichTextHtml(description, 135) ||
    `${place}에서 열린 연영회 ${title}의 전시 정보와 작품 사진을 확인하세요.`
  );
};

export async function generateMetadata({
  params,
}: ExhibitionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const exhibition = await getExhibition(id);

  if (!exhibition) {
    notFound();
  }

  return createPageMetadata({
    title: `${exhibition.title} | 연영회 전시`,
    description: buildExhibitionDescription(
      exhibition.description,
      exhibition.title,
      exhibition.place,
    ),
    path: `/archive/exhibitions/${exhibition.id}`,
    keywords: [exhibition.title, "연영회 전시", "연세대학교 사진전", "대학생 사진 전시"],
  });
}

/**
 * id에 의존하는 모든 것을 담는다.
 *
 * `await params`가 이 컴포넌트 안에서 일어나야 `generateStaticParams`에 없는 id로
 * 들어와도 바깥 프레임이 App Shell로 먼저 나갈 수 있다.
 */
async function ExhibitionDetailContent({ params }: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await getExhibition(id);

  if (!exhibition) {
    notFound();
  }

  const siteUrl = resolveSiteUrl();
  const pageUrl = `${siteUrl}/archive/exhibitions/${exhibition.id}`;
  const description = buildExhibitionDescription(
    exhibition.description,
    exhibition.title,
    exhibition.place,
  );
  const exhibitionJsonLd = {
    "@context": "https://schema.org",
    // Event 의 하위 유형이라 Google 이벤트 결과 대상은 그대로다.
    "@type": "ExhibitionEvent",
    "@id": `${pageUrl}#event`,
    name: exhibition.title,
    description,
    url: pageUrl,
    image: buildJsonLdImages(exhibition.coverImageUrl, exhibition.detailImages),
    startDate: formatKoreanIsoDate(exhibition.startDate),
    endDate: formatKoreanIsoDate(exhibition.endDate),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    inLanguage: "ko-KR",
    location: {
      "@type": "Place",
      name: exhibition.place,
      // Google 이벤트 결과는 오프라인 행사의 주소를 요구한다. 입력된 전시만 담는다.
      ...(exhibition.placeAddress ? { address: exhibition.placeAddress } : {}),
    },
    organizer: buildOrganizationRef(siteUrl),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", url: siteUrl },
    { name: "전시회", url: `${siteUrl}/archive/exhibitions` },
    { name: exhibition.title, url: pageUrl },
  ]);

  return (
    <>
      <PageViewTracker pageType="exhibition" resourceId={id} />
      <JsonLd data={exhibitionJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <header className="mb-8">
        <h1 className="m-0 text-[1.7rem] font-bold text-(--text-primary) md:text-[2rem]">
          {exhibition.title}
        </h1>
        <p className="mb-0 mt-3 text-[0.95rem] text-(--text-muted)">
          {formatKoreanDateCompact(exhibition.startDate)} ~{" "}
          {formatKoreanDateCompact(exhibition.endDate)}
        </p>
        <p className="mb-0 mt-[0.4rem] text-(--text-secondary)">{exhibition.place}</p>
        {exhibition.placeAddress ? (
          <p className="mb-0 mt-1 text-[0.9rem] text-(--text-muted)">
            {exhibition.placeAddress}
          </p>
        ) : null}
        <RichTextContent
          html={exhibition.description}
          className="exhibition-description mb-0 mt-3 leading-[1.6]"
        />
      </header>

      <PhotoGallery
        items={toDetailGalleryItems(exhibition)}
        fallbackAspect={2 / 3}
        refAspect={0.75}
        data-testid="exhibition-detail-gallery"
      />
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

export default function ExhibitionDetailPage({ params }: ExhibitionDetailPageProps) {
  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <Link
          href="/archive/exhibitions"
          className="mb-4 inline-flex min-h-11 items-center text-[0.9rem] text-(--text-primary) no-underline hover:underline"
        >
          전시 아카이브로 돌아가기
        </Link>

        <Suspense
          fallback={
            <ArchiveDetailSkeleton
              metaLines={2}
              tileAspect="aspect-[2/3]"
              data-testid="exhibition-detail-skeleton"
            />
          }
        >
          <ExhibitionDetailContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}
