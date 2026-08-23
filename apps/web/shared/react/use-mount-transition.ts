"use client";

import { useEffect, useState } from "react";

export type MountTransitionState = "entering" | "open" | "closing";

type Phase = MountTransitionState | "closed";

type MountTransition = {
  /** 마운트해야 하는지 — 닫히는 중에도 true 여야 퇴장 애니메이션이 보인다. */
  isMounted: boolean;
  /** CSS 가 읽는 단계 값. `data-state` 로 그대로 내보내면 된다. */
  state: MountTransitionState;
};

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 열림 상태 하나로 등장/퇴장 애니메이션을 만드는 훅 — framer-motion 의
 * `AnimatePresence` 를 대체한다.
 *
 * 왜 직접 만드는가: 공개 라우트에서 오버레이 세 곳(모바일 메뉴, 사진 라이트박스,
 * 사진가 상세 모달)이 `AnimatePresence` 하나 때문에 framer-motion 전체(gzip 약
 * 43KB)를 초기 번들로 끌어왔다. 실제로 쓰는 것은 "닫는 동안 DOM 에 남겨 두기"
 * 뿐이라 훅 하나로 충분하다.
 *
 * 단계:
 *   closed → (열기) → `entering` 두 프레임 → `open`
 *   open   → (닫기) → `closing` (exitMs) → closed(언마운트)
 *
 * `entering` 을 거치는 이유: 마운트 직후의 시작 스타일이 실제로 페인팅돼야
 * 브라우저가 전환을 보간한다. 바로 `open` 으로 두면 전환 없이 튄다.
 *
 * 단계 전환은 전부 rAF/타이머 콜백 안에서 일어난다 — effect 본문에서 곧바로
 * setState 하면 연쇄 렌더가 되고, 이 저장소는 `react-hooks/set-state-in-effect`
 * 를 전역으로 켜 두었다. 열림 여부 자체는 렌더 중 비교로 반영한다(React 의
 * "props 변화로 상태 조정" 패턴).
 *
 * 감소 모드에서는 지연을 0 으로 줄인다. 시작 스타일도 globals.css 가 감소 모드
 * 에서 최종 값으로 덮으므로 깜빡임이 없다.
 */
export const useMountTransition = (isOpen: boolean, exitMs: number): MountTransition => {
  const [phase, setPhase] = useState<Phase>(isOpen ? "open" : "closed");
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);

  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    setPhase(isOpen ? "entering" : "closing");
  }

  useEffect(() => {
    if (phase === "entering") {
      // 두 프레임을 기다린다. 한 프레임만으로는 스타일 재계산 전에 값이 바뀌어
      // 전환이 생략되는 브라우저가 있다.
      let innerFrame = 0;
      const outerFrame = requestAnimationFrame(() => {
        innerFrame = requestAnimationFrame(() => setPhase("open"));
      });
      return () => {
        cancelAnimationFrame(outerFrame);
        cancelAnimationFrame(innerFrame);
      };
    }

    if (phase === "closing") {
      const timeoutId = setTimeout(
        () => setPhase("closed"),
        prefersReducedMotion() ? 0 : exitMs,
      );
      return () => clearTimeout(timeoutId);
    }

    return undefined;
  }, [phase, exitMs]);

  return {
    isMounted: phase !== "closed",
    state: phase === "closed" ? "closing" : phase,
  };
};
