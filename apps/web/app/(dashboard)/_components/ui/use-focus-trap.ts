"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const listFocusable = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );

/**
 * 모달 안에 포커스를 가둔다.
 *
 * 재디자인 이전 모바일 드로어는 role="dialog" aria-modal="true" 를 달고도
 * 트랩이 없어서 키보드 사용자가 배경으로 그냥 탭해 나갔다.
 *
 * 담당 범위:
 *  - 열릴 때 첫 포커스를 컨테이너 안으로 이동
 *  - Tab / Shift+Tab 순환
 *  - 배경 스크롤 잠금
 *  - 닫힐 때 직전에 포커스가 있던 요소로 복귀
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const [firstFocusable] = listFocusable(container);
    (firstFocusable ?? container).focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Tab") {
        return;
      }

      const focusable = listFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last?.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [containerRef, isActive]);
};
