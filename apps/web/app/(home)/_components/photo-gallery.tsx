"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { PhotoGalleryTile } from "./photo-gallery-tile";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoPreloadImages } from "./photo-preload-images";

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
 * 라이트박스가 열려 있을 때 앞뒤로 몇 장까지 미리 받아둘지.
 * 늘리면 연타에 더 강해지지만, 끝내 안 볼 사진까지 받게 되고 Cloudflare 변환 건수도 그만큼 늘어난다.
 */
const PRELOAD_RADIUS = 1;

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
  // 마지막으로 hover/focus 가 닿은 타일. 집합이 아니라 최신 1개만 들고 있어야
  // 미리 받는 이미지 수가 묶여 모바일 메모리가 터지지 않는다.
  // hover 가 빠져도 비우지 않는다 — 받다 만 요청을 버리는 게 더 손해다.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  /**
   * 확대용 원본 로딩이 끝난 사진의 key 집합.
   * 미리 받아둔 사진까지 여기 기록되므로, 라이트박스로 넘어갈 때 스켈레톤을 건너뛸 수 있다.
   */
  const [loadedKeys, setLoadedKeys] = useState<Record<string, true>>({});

  // 실패한 이미지도 "완료"로 처리해야 스켈레톤이 영원히 남지 않는다(alt 텍스트가 대신 보인다)
  const markLoaded = useCallback((key: string) => {
    setLoadedKeys((current) => (current[key] ? current : { ...current, [key]: true }));
  }, []);

  const aspects = useMemo(() => {
    return items.map((item) => {
      if (item.width !== null && item.height !== null && item.height > 0) {
        return item.width / item.height;
      }
      return measuredAspects[item.key] ?? fallbackAspect;
    });
  }, [items, measuredAspects, fallbackAspect]);

  /**
   * 미리 받아둘 사진의 index.
   * 라이트박스가 열려 있으면 곧 이동할 앞뒤 사진을, 닫혀 있으면 hover 중인 타일 하나를 받는다.
   * 어느 쪽이든 동시에 최대 2장이라 메모리가 무한정 늘지 않는다.
   */
  const preloadIndices = useMemo(() => {
    const total = items.length;
    if (total === 0) {
      return [];
    }

    if (openIndex === null) {
      return hoveredIndex !== null && hoveredIndex < total ? [hoveredIndex] : [];
    }

    const targets = new Set<number>();
    for (let delta = 1; delta <= PRELOAD_RADIUS; delta += 1) {
      targets.add((((openIndex - delta) % total) + total) % total);
      targets.add((openIndex + delta) % total);
    }
    // 사진이 1~2장이면 순환 계산이 자기 자신을 가리킬 수 있다
    targets.delete(openIndex);
    return [...targets];
  }, [items.length, openIndex, hoveredIndex]);

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
            onWarm={setHoveredIndex}
            onMeasure={(ratio) => {
              setMeasuredAspects((previous) => ({ ...previous, [item.key]: ratio }));
            }}
          />
        ))}
      </ul>

      {/* 라이트박스가 닫히면 portal 내용이 사라지므로, 프리로더는 반드시 그 바깥에 둔다 */}
      <PhotoPreloadImages items={items} indices={preloadIndices} onLoaded={markLoaded} />

      <PhotoLightbox
        items={items}
        aspects={aspects}
        openIndex={openIndex}
        onClose={handleClose}
        onStep={handleStep}
        loadedKeys={loadedKeys}
        onImageLoaded={markLoaded}
      />
    </>
  );
}
