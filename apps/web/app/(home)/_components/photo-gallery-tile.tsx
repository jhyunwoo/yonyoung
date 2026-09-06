import Image from "next/image";
import type { CSSProperties } from "react";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import type { PhotoGalleryItem } from "./photo-gallery";

type PhotoGalleryTileProps = {
  item: PhotoGalleryItem;
  /** 이 사진에 적용할 비율(가로/세로) */
  aspect: number;
  index: number;
};

const TILE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 34vw";

/**
 * justified rows 갤러리의 한 칸 — 서버 컴포넌트다.
 *
 * 폭·높이·행 배치는 전부 globals.css 의 .photo-gallery-item 이 --photo-aspect 로 계산하므로
 * 여기서는 비율 값만 인라인으로 넘긴다(반드시 순수 숫자 — "4 / 3" 형식은 calc 를 무효화한다).
 *
 * 클릭·hover·포커스 핸들러가 붙어 있지 않은 이유: 상위 `PhotoGalleryController` 가
 * `<ul>` 한 곳에서 이벤트 위임으로 받는다. 그래서 필요한 것은 `data-photo-index` 로
 * "몇 번째 사진인지"를 표시해 두는 것뿐이다.
 *
 * DB에 원본 크기가 없는 레거시 이미지는 우선 폴백 비율로 렌더링한 뒤, 브라우저가
 * 디코딩을 끝내면 컨트롤러가 naturalWidth/naturalHeight 로 실제 비율을 보정한다.
 */
export function PhotoGalleryTile({ item, aspect, index }: PhotoGalleryTileProps) {
  const hasStoredSize = item.width !== null && item.height !== null;

  return (
    <li
      className="photo-gallery-item border border-(--surface-border) bg-(--surface-muted)"
      style={{ "--photo-aspect": aspect.toFixed(4) } as CSSProperties}
      data-photo-index={index}
      // 로딩 스켈레톤. 타일에 핸들러를 붙이지 않으려고 상태가 아니라 속성으로 표시한다.
      // 아일랜드가 하이드레이션 전에 data-image-loaded 를 붙일 수 있어 경고를 끈다
      data-image-skeleton
      suppressHydrationWarning
      // 치수를 모르는 사진만 로드 후 측정이 필요하다는 표시
      {...(hasStoredSize ? {} : { "data-photo-measure": "" })}
    >
      {/* absolute inset-0: li 의 aspect-ratio 높이를 그대로 채우면서 Image fill 의 기준이 된다 */}
      <button
        type="button"
        // li 의 overflow:hidden 이 바깥쪽 포커스 링을 자르므로 안쪽으로 그린다
        className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--text-primary)"
        aria-label={`${item.alt} 크게 보기`}
        data-testid={`gallery-photo-button-${item.key}`}
      >
        <Image
          src={item.imageUrl}
          alt={item.alt}
          fill
          unoptimized={shouldUseUnoptimizedImage(item.imageUrl)}
          // 프레임 비율이 곧 사진 비율이라 실제로는 크롭이 일어나지 않는다
          className="object-cover"
          sizes={TILE_SIZES}
        />
      </button>
    </li>
  );
}
