import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { AdaptiveGalleryImage } from "./adaptive-gallery-image";

export type MasonryGalleryItem = {
  /** React key로 사용할 고유 값 */
  key: string;
  imageUrl: string;
  alt: string;
  /** 원본 가로 픽셀 (레거시 데이터는 null → 클라이언트 측정 폴백) */
  width: number | null;
  /** 원본 세로 픽셀 (레거시 데이터는 null → 클라이언트 측정 폴백) */
  height: number | null;
};

type MasonryGalleryProps = {
  items: MasonryGalleryItem[];
  /** 크기 미상 이미지에 사용할 CSS aspect-ratio 폴백 (예: "2 / 3") */
  fallbackAspectRatio: string;
  "data-testid"?: string;
};

const IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

/**
 * 사진 원본 비율을 유지하는 Masonry(핀터레스트식) 갤러리 — 서버 컴포넌트.
 *
 * CSS multi-column(columns-*)으로 구현해 JS 없이 SSR/정적 렌더링과 호환됩니다.
 * 항목 순서는 컬럼 우선(위→아래 채운 뒤 다음 컬럼)이며 사진 아카이브 특성상 허용됩니다.
 *
 * - width/height가 있는 이미지: next/image에 크기를 지정해 CLS 없이 원본 비율로 렌더링
 * - 크기 미상(레거시) 이미지: AdaptiveGalleryImage가 로드 후 실제 비율로 보정
 */
export function MasonryGallery({
  items,
  fallbackAspectRatio,
  "data-testid": dataTestId,
}: MasonryGalleryProps) {
  return (
    <section
      className="columns-1 gap-4 sm:columns-2 lg:columns-3"
      data-testid={dataTestId}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="mb-4 break-inside-avoid overflow-hidden border border-(--surface-border) bg-(--surface-muted)"
        >
          {item.width !== null && item.height !== null ? (
            <Image
              src={item.imageUrl}
              alt={item.alt}
              width={item.width}
              height={item.height}
              unoptimized={shouldUseUnoptimizedImage(item.imageUrl)}
              className="h-auto w-full"
              sizes={IMAGE_SIZES}
            />
          ) : (
            <AdaptiveGalleryImage
              src={item.imageUrl}
              alt={item.alt}
              fallbackAspectRatio={fallbackAspectRatio}
              sizes={IMAGE_SIZES}
            />
          )}
        </div>
      ))}
    </section>
  );
}
