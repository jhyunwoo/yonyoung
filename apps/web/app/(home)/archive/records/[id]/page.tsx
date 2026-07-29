import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getPublicActivityById,
  getPublicAttachments,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { summarizeRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata, resolveSiteUrl } from "@/features/seo/metadata/seo";
import JsonLd from "@/features/seo/structured-data/json-ld";
import PageViewTracker from "@/app/_components/page-view-tracker";
import {
  PhotoGallery,
  type PhotoGalleryItem,
} from "@/app/(home)/_components/photo-gallery";
import { AttachmentList } from "@/app/(home)/_components/attachment-list";

type RecordDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const getActivity = cache(async (id: string) => {
  return getPublicActivityById(id).catch(() => null);
});

const buildActivityDescription = (description: string, title: string): string => {
  return (
    summarizeRichTextHtml(description, 145) ||
    `연세대학교 중앙사진동아리 연영회의 ${title} 활동 사진과 기록을 확인하세요.`
  );
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

export default async function RecordDetailPage({ params }: RecordDetailPageProps) {
  const { id } = await params;
  // 활동 정보와 첨부 자료는 독립적이므로 병렬로 조회한다
  const [activity, attachments] = await Promise.all([
    getActivity(id),
    getPublicAttachments("activity", id).catch(() => []),
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
    headline: activity.title,
    description,
    image: [
      activity.coverImageUrl,
      ...activity.detailImages.map((image) => image.imageUrl),
    ],
    datePublished: new Date(activity.createdAt).toISOString(),
    dateModified: new Date(activity.updatedAt).toISOString(),
    inLanguage: "ko-KR",
    author: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "연영회",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "연영회",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/android-chrome-512x512.png`,
      },
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
        name: "활동 기록",
        item: `${siteUrl}/archive/records`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: activity.title,
        item: pageUrl,
      },
    ],
  };

  // 상세 이미지가 없으면 커버 이미지 한 장으로 대체 (커버는 크기 정보가 없어 폴백 측정 사용)
  const galleryItems: PhotoGalleryItem[] =
    activity.detailImages.length > 0
      ? activity.detailImages
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image, index) => ({
            key: image.id,
            imageUrl: image.imageUrl,
            alt: `${activity.title} 상세 이미지 ${index + 1}`,
            width: image.width,
            height: image.height,
          }))
      : [
          {
            key: `${activity.id}-cover`,
            imageUrl: activity.coverImageUrl,
            alt: `${activity.title} 대표 이미지`,
            width: null,
            height: null,
          },
        ];

  return (
    <div className="min-h-screen bg-(--bg-primary) pb-9 pt-3 md:pb-12 md:pt-4">
      <PageViewTracker pageType="activity" resourceId={id} />
      <JsonLd data={activityJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <header className="mb-8">
          <Link
            href="/archive/records"
            className="mb-4 inline-flex text-[0.9rem] text-(--text-primary) no-underline hover:underline"
          >
            활동 기록으로 돌아가기
          </Link>
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
          items={galleryItems}
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
      </div>
    </div>
  );
}
