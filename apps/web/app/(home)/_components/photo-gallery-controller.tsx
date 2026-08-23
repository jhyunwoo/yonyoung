"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { PhotoGalleryItem } from "./photo-gallery";
import { PhotoLightbox } from "./photo-lightbox";
import { PhotoPreloadImages } from "./photo-preload-images";

type PhotoGalleryControllerProps = {
  items: PhotoGalleryItem[];
  fallbackAspect: number;
  refAspect: number;
  "data-testid"?: string;
  /** 서버에서 그린 `<li>` 타일들 */
  children: ReactNode;
};

/**
 * 라이트박스가 열려 있을 때 앞뒤로 몇 장까지 미리 받아둘지.
 * 늘리면 연타에 더 강해지지만, 끝내 안 볼 사진까지 받게 되고 Cloudflare 변환 건수도 그만큼 늘어난다.
 */
const PRELOAD_RADIUS = 1;

const readTileIndex = (target: EventTarget | null): number | null => {
  if (!(target instanceof Element)) {
    return null;
  }
  const tile = target.closest("[data-photo-index]");
  if (!(tile instanceof HTMLElement)) {
    return null;
  }
  const parsed = Number(tile.dataset.photoIndex);
  return Number.isInteger(parsed) ? parsed : null;
};

/**
 * 갤러리 상호작용 담당 — 사진이 몇 장이든 이 컴포넌트 하나만 하이드레이션된다.
 *
 * 타일은 서버 HTML 이므로 핸들러를 직접 붙일 수 없다. 대신 `<ul>` 한 곳에서
 * 위임으로 받는다:
 *   - click       → 라이트박스 열기
 *   - pointerover → 곧 클릭할 것 같은 사진 미리 받기 (pointerenter 는 버블링하지 않는다)
 *   - focusin     → 키보드 경로의 같은 신호
 *   - load(capture) → 치수 미상 사진의 실제 비율 보정
 *     load 는 버블링하지 않지만 캡처 단계는 조상까지 내려오므로 capture:true 로 받는다.
 */
export function PhotoGalleryController({
  items,
  fallbackAspect,
  refAspect,
  "data-testid": dataTestId,
  children,
}: PhotoGalleryControllerProps) {
  const listRef = useRef<HTMLUListElement | null>(null);
  // 라이트박스가 닫혀도 index 는 지우지 않는다. 퇴장 애니메이션 동안 같은 사진이
  // 그대로 남아야 하고, 그 값을 ref 로 들고 있으면 렌더 중 ref 접근이 된다.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const onClick = (event: MouseEvent) => {
      const index = readTileIndex(event.target);
      if (index !== null) {
        setOpenIndex(index);
        setIsLightboxOpen(true);
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      const index = readTileIndex(event.target);
      if (index !== null) {
        setHoveredIndex((current) => (current === index ? current : index));
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const index = readTileIndex(event.target);
      if (index !== null) {
        setHoveredIndex((current) => (current === index ? current : index));
      }
    };

    const onLoadCapture = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) {
        return;
      }
      const tile = image.closest("[data-photo-index]");
      if (!(tile instanceof HTMLElement) || tile.dataset.photoMeasure === undefined) {
        return;
      }
      const { naturalWidth, naturalHeight } = image;
      if (naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }
      const index = Number(tile.dataset.photoIndex);
      const item = items[index];
      if (!item) {
        return;
      }
      const ratio = naturalWidth / naturalHeight;
      // 타일은 서버 HTML 이라 리렌더로 갱신할 수 없다. 실제 비율은 DOM 에 직접 쓴다.
      tile.style.setProperty("--photo-aspect", ratio.toFixed(4));
      setMeasuredAspects((previous) =>
        previous[item.key] === ratio ? previous : { ...previous, [item.key]: ratio },
      );
    };

    list.addEventListener("click", onClick);
    list.addEventListener("pointerover", onPointerOver);
    list.addEventListener("focusin", onFocusIn);
    list.addEventListener("load", onLoadCapture, true);

    return () => {
      list.removeEventListener("click", onClick);
      list.removeEventListener("pointerover", onPointerOver);
      list.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("load", onLoadCapture, true);
    };
  }, [items]);

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

    if (!isLightboxOpen || openIndex === null) {
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
  }, [items.length, isLightboxOpen, openIndex, hoveredIndex]);

  const handleClose = useCallback(() => {
    setIsLightboxOpen(false);
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
        ref={listRef}
        className="photo-gallery"
        style={{ "--gallery-ref-aspect": String(refAspect) } as CSSProperties}
        data-testid={dataTestId}
      >
        {children}
      </ul>

      {/* 라이트박스가 닫히면 portal 내용이 사라지므로, 프리로더는 반드시 그 바깥에 둔다 */}
      <PhotoPreloadImages items={items} indices={preloadIndices} onLoaded={markLoaded} />

      <PhotoLightbox
        items={items}
        aspects={aspects}
        isOpen={isLightboxOpen}
        openIndex={openIndex}
        onClose={handleClose}
        onStep={handleStep}
        loadedKeys={loadedKeys}
        onImageLoaded={markLoaded}
      />
    </>
  );
}
