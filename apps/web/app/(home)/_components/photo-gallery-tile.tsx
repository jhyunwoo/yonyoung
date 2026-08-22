"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import type { PhotoGalleryItem } from "./photo-gallery";

type PhotoGalleryTileProps = {
  item: PhotoGalleryItem;
  /** 이 사진에 적용할 비율(가로/세로) */
  aspect: number;
  index: number;
  onSelect: (index: number) => void;
  /** 치수 미상(레거시) 이미지가 로드된 뒤 실제 비율을 알려준다 */
  onMeasure: (ratio: number) => void;
  /** 곧 클릭할 것 같은 사진을 미리 받아두게 알려준다 */
  onWarm: (index: number) => void;
};

const TILE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw";

/**
 * justified rows 갤러리의 한 칸.
 *
 * 폭·높이·행 배치는 전부 globals.css 의 .photo-gallery-item 이 --photo-aspect 로 계산하므로
 * 여기서는 비율 값만 인라인으로 넘긴다(반드시 순수 숫자 — "4 / 3" 형식은 calc 를 무효화한다).
 *
 * DB에 원본 크기가 없는 레거시 이미지는 우선 폴백 비율로 렌더링한 뒤,
 * 브라우저가 디코딩을 끝내면 naturalWidth/naturalHeight 로 실제 비율을 보정한다.
 */
export function PhotoGalleryTile({
  item,
  aspect,
  index,
  onSelect,
  onMeasure,
  onWarm,
}: PhotoGalleryTileProps) {
  const hasStoredSize = item.width !== null && item.height !== null;

  return (
    <li
      className="photo-gallery-item border border-(--surface-border) bg-(--surface-muted)"
      style={{ "--photo-aspect": aspect.toFixed(4) } as CSSProperties}
    >
      {/* absolute inset-0: li 의 aspect-ratio 높이를 그대로 채우면서 Image fill 의 기준이 된다 */}
      <button
        type="button"
        // li 의 overflow:hidden 이 바깥쪽 포커스 링을 자르므로 안쪽으로 그린다
        className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-primary)"
        aria-label={`${item.alt} 크게 보기`}
        data-testid={`gallery-photo-button-${item.key}`}
        onClick={() => onSelect(index)}
        // 마우스·펜은 hover 시점에, 터치는 탭 다운 시점에 확대용 이미지를 미리 받기 시작한다
        onPointerEnter={() => onWarm(index)}
        onFocus={() => onWarm(index)}
      >
        <Image
          src={item.imageUrl}
          alt={item.alt}
          fill
          unoptimized={shouldUseUnoptimizedImage(item.imageUrl)}
          // 프레임 비율이 곧 사진 비율이라 실제로는 크롭이 일어나지 않는다
          className="object-cover"
          sizes={TILE_SIZES}
          onLoad={
            hasStoredSize
              ? undefined
              : (event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth > 0 && naturalHeight > 0) {
                    onMeasure(naturalWidth / naturalHeight);
                  }
                }
          }
        />
      </button>
    </li>
  );
}
