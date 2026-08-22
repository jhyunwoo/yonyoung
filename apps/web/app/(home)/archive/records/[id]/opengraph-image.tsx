import { getPublicActivityById } from "@/features/public/services/public-read-service";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { loadOgCoverImage } from "@/features/seo/og/og-cover-image";
import { OG_CONTENT_TYPE, OG_IMAGE_SIZE, renderOgCard } from "@/features/seo/og/og-card";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";

// 페이지와 같은 목록을 써서 공개된 활동의 OG 이미지를 전부 빌드 시점에 PNG로 굽는다.
// Next의 메타데이터 라우트 로더가 이 파일의 named export를 그대로 재수출한다.
export { generateActivityStaticParams as generateStaticParams } from "@/features/public/services/public-static-params";

export const alt = "연영회 활동 기록 미리보기 이미지";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_CONTENT_TYPE;

type OpenGraphImageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { id } = await params;
  const activity = await getPublicActivityById(id).catch(() => null);

  if (!activity) {
    // 삭제되었거나 아직 없는 id — 사이트 기본 카드로 대체한다.
    return renderOgCard({
      title: PAGE_SEO.archiveRecords.title,
      description: PAGE_SEO.archiveRecords.description,
    });
  }

  return renderOgCard({
    title: activity.title,
    description: PAGE_SEO.archiveRecords.description,
    meta: formatKoreanDateRange(activity.startDate, activity.endDate),
    coverImageDataUrl: await loadOgCoverImage(activity.coverImageUrl),
  });
}
