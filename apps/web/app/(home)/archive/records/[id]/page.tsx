import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublicActivityById,
  getPublicAttachments,
} from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageViewTracker from "@/app/_components/page-view-tracker";
import {
  MasonryGallery,
  type MasonryGalleryItem,
} from "@/app/(home)/_components/masonry-gallery";
import { AttachmentList } from "@/app/(home)/_components/attachment-list";

export const metadata: Metadata = createPageMetadata({
  title: "활동 기록 상세 | 연영회",
  description: "연영회 활동 기록 상세를 확인하세요.",
  path: "/archive/records",
});

type RecordDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecordDetailPage({ params }: RecordDetailPageProps) {
  const { id } = await params;
  // 활동 정보와 첨부 자료는 독립적이므로 병렬로 조회한다
  const [activity, attachments] = await Promise.all([
    getPublicActivityById(id).catch(() => null),
    getPublicAttachments("activity", id).catch(() => []),
  ]);

  if (!activity) {
    notFound();
  }

  // 상세 이미지가 없으면 커버 이미지 한 장으로 대체 (커버는 크기 정보가 없어 폴백 측정 사용)
  const galleryItems: MasonryGalleryItem[] =
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

        <MasonryGallery
          items={galleryItems}
          fallbackAspectRatio="4 / 3"
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
