"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { PhotoGalleryTile } from "./photo-gallery-tile";
import { PhotoLightbox } from "./photo-lightbox";

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
 * 사진 원본 비율을 유지하는 justified rows 갤러리 (Google Photos 방식).
 *
 * 배치 순서는 DOM 순서 그대로 왼쪽 → 오른쪽이며, 한 행 안의 사진 높이는 CSS 가
 * 자동으로 맞춘다 (수학은 globals.css 의 .photo-gallery 주석 참고).
 * 사진을 클릭하면 라이트박스로 확대해 볼 수 있어 클라이언트 컴포넌트다.
 */
export function PhotoGallery({
  items,
  fallbackAspect,
  refAspect,
  "data-testid": dataTestId,
}: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // 레거시 이미지가 로드 후 측정한 비율. 그리드와 라이트박스가 같은 값을 써야
  // 라이트박스 프레임에 letterbox 가 생기지 않는다.
  const [measuredAspects, setMeasuredAspects] = useState<Record<string, number>>({});

  const aspects = useMemo(() => {
    return items.map((item) => {
      if (item.width !== null && item.height !== null && item.height > 0) {
        return item.width / item.height;
      }
      return measuredAspects[item.key] ?? fallbackAspect;
    });
  }, [items, measuredAspects, fallbackAspect]);

  const handleClose = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const handleStep = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null || items.length === 0) {
          return current;
        }
        return (current + delta + items.length) % items.length;
      });
    },
    [items.length],
  );

  return (
    <>
      <ul
        className="photo-gallery"
        style={{ "--gallery-ref-aspect": String(refAspect) } as CSSProperties}
        data-testid={dataTestId}
      >
        {items.map((item, index) => (
          <PhotoGalleryTile
            key={item.key}
            item={item}
            aspect={aspects[index] ?? fallbackAspect}
            index={index}
            onSelect={setOpenIndex}
            onMeasure={(ratio) => {
              setMeasuredAspects((previous) => ({ ...previous, [item.key]: ratio }));
            }}
          />
        ))}
      </ul>

      <PhotoLightbox
        items={items}
        aspects={aspects}
        openIndex={openIndex}
        onClose={handleClose}
        onStep={handleStep}
      />
    </>
  );
}
