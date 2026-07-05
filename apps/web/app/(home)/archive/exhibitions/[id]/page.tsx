import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicExhibitionById } from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { createPageMetadata } from "@/features/seo/metadata/seo";
import PageViewTracker from "@/app/_components/page-view-tracker";
import {
  MasonryGallery,
  type MasonryGalleryItem,
} from "@/app/(home)/_components/masonry-gallery";

export const metadata: Metadata = createPageMetadata({
  title: "전시 아카이브 상세 | 연영회",
  description: "연영회 전시 아카이브 상세를 확인하세요.",
  path: "/archive/exhibitions",
});

type ExhibitionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExhibitionDetailPage({
  params,
}: ExhibitionDetailPageProps) {
  const { id } = await params;
  const exhibition = await getPublicExhibitionById(id).catch(() => null);

  if (!exhibition) {
    notFound();
  }

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
