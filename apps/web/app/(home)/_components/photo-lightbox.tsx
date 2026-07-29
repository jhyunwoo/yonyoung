"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";

export type PhotoLightboxItem = {
  key: string;
  imageUrl: string;
  alt: string;
};

type PhotoLightboxProps = {
  items: PhotoLightboxItem[];
  /** items 와 같은 순서의 사진 비율(가로/세로) */
  aspects: number[];
  /** null 이면 닫힌 상태 */
  openIndex: number | null;
  onClose: () => void;
  /** delta 만큼 이동(끝에서 순환) */
  onStep: (delta: number) => void;
};

const BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * 사진 확대 보기 오버레이.
 *
 * 갤러리 컨테이너(.photo-gallery)가 container-type 때문에 position:fixed 후손의
 * 컨테이닝 블록이 되므로, 반드시 portal 로 body 에 붙여야 화면 전체를 덮는다.
 *
 * 사진 프레임은 max-width/max-height 대신 아래 한 줄로 크기를 잡는다.
 *   width: min(90vw, calc(82svh * A))  →  height = min(90vw / A, 82svh)
 * 이러면 프레임 박스가 사진과 정확히 일치해 letterbox(사진 옆 빈 영역)가 아예 없다.
 * object-contain 은 페인팅만 바꾸고 <img> 요소 박스는 컨테이너 전체를 차지하므로,
 * 프레임을 사진 크기에 맞추지 않으면 "사진 옆 어두운 영역" 클릭이 이미지에 맞아 닫히지 않는다.
 */
export function PhotoLightbox({
  items,
  aspects,
  openIndex,
  onClose,
  onStep,
}: PhotoLightboxProps) {
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // 닫을 때 원래 눌렀던 사진 버튼으로 포커스를 되돌리기 위해 보관한다
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const activeIndex =
    openIndex !== null && openIndex >= 0 && openIndex < items.length ? openIndex : null;
  const isOpen = activeIndex !== null;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 배경 스크롤 잠금 + 포커스 이동/복귀
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  // 키보드 조작 — 핸들러 identity 가 바뀌어도 리스너 재등록은 저렴하다
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (items.length <= 1) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onStep(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, items.length, onClose, onStep]);

  if (!isMounted) {
    return null;
  }

  const activeItem = activeIndex === null ? null : items[activeIndex];
  // 인덱스·사진·비율을 한 객체로 묶어야 JSX 안에서 좁히기가 유지된다
  const active =
    activeIndex !== null && activeItem
      ? { index: activeIndex, item: activeItem, aspect: aspects[activeIndex] ?? 1 }
      : null;
  const hasMultiple = items.length > 1;

  return createPortal(
    <AnimatePresence>
      {active ? (
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          data-testid="gallery-lightbox"
          className="fixed inset-0 z-[1200] bg-black/90 outline-none"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
          }
        >
          {/* 사진 밖 어두운 영역 클릭 시 닫기. Esc·닫기 버튼이 키보드 경로를 커버하므로 aria-hidden */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            data-testid="gallery-lightbox-backdrop"
            onClick={onClose}
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="pointer-events-auto relative"
              data-testid="gallery-lightbox-frame"
              style={
                {
                  "--photo-aspect": active.aspect.toFixed(4),
                  width: "min(90vw, calc(82svh * var(--photo-aspect)))",
                  aspectRatio: "var(--photo-aspect)",
                } as CSSProperties
              }
            >
              <Image
                key={active.item.key}
                src={active.item.imageUrl}
                alt={active.item.alt}
                fill
                unoptimized={shouldUseUnoptimizedImage(active.item.imageUrl)}
                className="object-contain"
                sizes="(min-width: 1024px) 90vw, 100vw"
              />
            </div>
          </div>

          <button
            type="button"
            className={`absolute right-3 top-3 ${BUTTON_CLASS}`}
            aria-label="사진 보기 닫기"
            data-testid="gallery-lightbox-close"
            onClick={onClose}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>

          {hasMultiple ? (
            <>
              <button
                type="button"
                className={`absolute left-2 top-1/2 -translate-y-1/2 sm:left-4 ${BUTTON_CLASS}`}
                aria-label="이전 사진"
                data-testid="gallery-lightbox-prev"
                onClick={() => onStep(-1)}
              >
                <ChevronLeft aria-hidden="true" className="h-6 w-6" />
              </button>
              <button
                type="button"
                className={`absolute right-2 top-1/2 -translate-y-1/2 sm:right-4 ${BUTTON_CLASS}`}
                aria-label="다음 사진"
                data-testid="gallery-lightbox-next"
                onClick={() => onStep(1)}
              >
                <ChevronRight aria-hidden="true" className="h-6 w-6" />
              </button>
              <p
                aria-live="polite"
                className="pointer-events-none absolute bottom-4 left-1/2 m-0 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white"
                data-testid="gallery-lightbox-counter"
              >
                {active.index + 1} / {items.length}
              </p>
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
