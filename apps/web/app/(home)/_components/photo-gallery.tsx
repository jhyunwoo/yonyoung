import { PhotoGalleryController } from "./photo-gallery-controller";
import { PhotoGalleryTile } from "./photo-gallery-tile";

export type PhotoGalleryItem = {
  /** React key로 사용할 고유 값 */
  key: string;
  imageUrl: string;
  alt: string;
  /** 원본 가로 픽셀 (레거시 데이터는 null → 클라이언트 측정 폴백) */
  width: number | null;
  /** 원본 세로 픽셀 (레거시 데이터는 null → 클라이언트 측정 폴백) */
  height: number | null;
};

type PhotoGalleryProps = {
  items: PhotoGalleryItem[];
  /** 치수 미상(레거시) 이미지에 우선 적용할 비율 (예: 4 / 3) */
  fallbackAspect: number;
  /**
   * 행 높이 계산 기준 비율 — 데스크탑 한 행에 몇 장이 들어갈지를 조절하는 손잡이.
   * 값을 올리면 행이 낮아지고 한 행에 더 많이 들어간다.
   */
  refAspect: number;
  "data-testid"?: string;
};

/**
 * 사진 원본 비율을 유지하는 justified rows 갤러리 (Google Photos 방식) — 서버 컴포넌트다.
 *
 * 배치 순서는 DOM 순서 그대로 왼쪽 → 오른쪽이며, 한 행 안의 사진 높이는 CSS 가
 * 자동으로 맞춘다 (수학은 globals.css 의 .photo-gallery 주석 참고).
 *
 * 예전에는 타일 하나하나가 클라이언트 컴포넌트였다. 상세 페이지 한 장에 사진이
 * 수십 장 들어가므로 그만큼의 하이드레이션 비용이 그대로 붙었는데, 타일이 실제로
 * 필요로 하는 것은 "클릭/hover/포커스했다"는 신호뿐이다. 그래서 타일은 서버 HTML 로
 * 내보내고, 상호작용은 `PhotoGalleryController` 하나가 이벤트 위임으로 처리한다.
 * 사진이 몇 장이든 클라이언트 컴포넌트는 컨트롤러 1개뿐이다.
 */
export function PhotoGallery({
  items,
  fallbackAspect,
  refAspect,
  "data-testid": dataTestId,
}: PhotoGalleryProps) {
  return (
    <PhotoGalleryController
      items={items}
      fallbackAspect={fallbackAspect}
      refAspect={refAspect}
      data-testid={dataTestId}
    >
      {items.map((item, index) => (
        <PhotoGalleryTile
          key={item.key}
          item={item}
          aspect={
            item.width !== null && item.height !== null && item.height > 0
              ? item.width / item.height
              : fallbackAspect
          }
          index={index}
        />
      ))}
    </PhotoGalleryController>
  );
}
