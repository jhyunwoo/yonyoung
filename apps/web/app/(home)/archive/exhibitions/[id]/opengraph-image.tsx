import { getPublicExhibitionById } from "@/features/public/services/public-read-service";
import { formatKoreanDateCompact } from "@/shared/utils/date-formatters";
import { loadOgCoverImage } from "@/features/seo/og/og-cover-image";
import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgCard } from "@/features/seo/og/og-card";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";

// 페이지와 같은 목록을 써서 공개된 전시의 OG 이미지를 전부 빌드 시점에 PNG로 굽는다.
export { generateExhibitionStaticParams as generateStaticParams } from "@/features/public/services/public-static-params";

export const alt = "연영회 전시 미리보기 이미지";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;

type OpenGraphImageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { id } = await params;
  const exhibition = await getPublicExhibitionById(id).catch(() => null);

  if (!exhibition) {
    // 삭제되었거나 아직 없는 id — 전시 아카이브 기본 카드로 대체한다.
    return renderOgCard({
      title: PAGE_SEO.archiveExhibitions.title,
      description: PAGE_SEO.archiveExhibitions.description,
    });
  }

  const period = `${formatKoreanDateCompact(exhibition.startDate)} ~ ${formatKoreanDateCompact(exhibition.endDate)}`;

  return renderOgCard({
    title: exhibition.title,
    description: PAGE_SEO.archiveExhibitions.description,
    meta: `${period} · ${exhibition.place}`,
    coverImageDataUrl: await loadOgCoverImage(exhibition.coverImageUrl),
  });
}
