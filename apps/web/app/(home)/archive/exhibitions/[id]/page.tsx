import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublicExhibitionById } from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata, resolveSiteUrl } from "@/features/seo/metadata/seo";
import JsonLd from "@/features/seo/structured-data/json-ld";
import PageViewTracker from "@/app/_components/page-view-tracker";
import {
  MasonryGallery,
  type MasonryGalleryItem,
} from "@/app/(home)/_components/masonry-gallery";

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

export default async function ExhibitionDetailPage({
  params,
}: ExhibitionDetailPageProps) {
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
    "@type": "Event",
    "@id": `${pageUrl}#event`,
    name: exhibition.title,
    description,
    url: pageUrl,
    image: [
      exhibition.coverImageUrl,
      ...exhibition.detailImages.map((image) => image.imageUrl),
    ],
    startDate: formatKoreanIsoDate(exhibition.startDate),
    endDate: formatKoreanIsoDate(exhibition.endDate),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    inLanguage: "ko-KR",
    location: {
      "@type": "Place",
      name: exhibition.place,
    },
    organizer: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "연영회",
      url: siteUrl,
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "전시회",
        item: `${siteUrl}/archive/exhibitions`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: exhibition.title,
        item: pageUrl,
      },
    ],
  };

  // 상세 이미지가 없으면 커버 이미지 한 장으로 대체 (커버는 크기 정보가 없어 폴백 측정 사용)
  const galleryItems: MasonryGalleryItem[] =
    exhibition.detailImages.length > 0
      ? exhibition.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image, index) => ({
            key: image.id,
            imageUrl: image.imageUrl,
            alt: `${exhibition.title} 상세 이미지 ${index + 1}`,
            width: image.width,
            height: image.height,
          }))
      : [
          {
            key: `${exhibition.id}-cover`,
            imageUrl: exhibition.coverImageUrl,
            alt: `${exhibition.title} 대표 이미지`,
            width: null,
            height: null,
          },
        ];

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <PageViewTracker pageType="exhibition" resourceId={id} />
      <JsonLd data={exhibitionJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <header className="mb-8">
          <Link
            href="/archive/exhibitions"
            className="mb-4 inline-flex text-[0.9rem] text-(--text-primary) no-underline hover:underline"
          >
            전시 아카이브로 돌아가기
          </Link>
          <h1 className="m-0 text-[1.7rem] font-bold text-(--text-primary) md:text-[2rem]">
            {exhibition.title}
          </h1>
          <p className="mb-0 mt-3 text-[0.95rem] text-(--text-muted)">
            {formatKoreanDateCompact(exhibition.startDate)} ~{" "}
            {formatKoreanDateCompact(exhibition.endDate)}
          </p>
          <p className="mb-0 mt-[0.4rem] text-(--text-secondary)">{exhibition.place}</p>
          <RichTextContent
            html={exhibition.description}
            className="exhibition-description mb-0 mt-3 leading-[1.6]"
          />
        </header>

        <MasonryGallery
          items={galleryItems}
          fallbackAspectRatio="2 / 3"
          data-testid="exhibition-detail-gallery"
        />
      </div>
    </div>
  );
}
