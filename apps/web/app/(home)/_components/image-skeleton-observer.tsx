"use client";

import { useEffect } from "react";

/*
  이미지 로딩 스켈레톤 해제 트리거 — 공개 레이아웃에 딱 하나만 둔다.

  스켈레톤 자체는 globals.css 의 `[data-image-skeleton]::before` 가 그린다. 여기서는
  로드가 끝난 프레임에 `data-image-loaded` 를 붙여 그 규칙을 끄는 일만 한다.

  이미지마다 상태를 들고 있는 래퍼 컴포넌트를 두지 않는 이유는 갤러리다. 타일은
  서버 컴포넌트이고, 거기에 상태를 붙이면 사진 장수만큼 클라이언트 컴포넌트가
  생긴다(photo-gallery-tile.tsx 참고). `RevealObserver` 와 같은 방식으로 아일랜드
  하나가 document 전체를 담당한다.

  스켈레톤이 이미지 "아래" 에 깔려 있으므로(::before 는 DOM 순서상 이미지보다 앞이다)
  이 아일랜드는 정확성의 전제가 아니라 애니메이션을 멈추는 최적화다. JS 가 실패해도
  사진은 그대로 보인다.

  세 가지 경로를 모두 받아야 스켈레톤이 남지 않는다:
    - load  → 정상 완료. 버블링하지 않으므로 capture:true 로 받는다.
    - error → 실패도 완료로 처리한다. 아니면 깨진 이미지 위에 스켈레톤이 영영 남는다.
    - complete 스캔 → 캐시에서 즉시 온 이미지는 하이드레이션 전에 load 가 끝나 있다.
      스트리밍·클라이언트 네비게이션으로 나중에 도착하는 마크업도 있으므로
      MutationObserver 로 재스캔한다(한 프레임에 한 번만 모아서).

  프레임에 `suppressHydrationWarning` 이 필요한 이유도 여기서 나온다. 스트리밍으로
  뒤늦게 하이드레이션되는 본문은 이 아일랜드가 먼저 `data-image-loaded` 를 붙일 수
  있는데, React 는 서버 HTML 에 없던 속성을 불일치로 잡는다(레이아웃이 theme-init.js
  때문에 `<html>` 에 같은 것을 붙이는 것과 같은 사정이다).
*/
const FRAME_SELECTOR = "[data-image-skeleton]:not([data-image-loaded])";

const clearFrame = (frame: Element) => {
  frame.setAttribute("data-image-loaded", "");
};

const clearFrameOf = (image: HTMLImageElement) => {
  const frame = image.closest(FRAME_SELECTOR);
  if (frame !== null) {
    clearFrame(frame);
  }
};

export default function ImageSkeletonObserver() {
  useEffect(() => {
    const onSettled = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        clearFrameOf(event.target);
      }
    };

    let scanQueued = false;
    const scan = () => {
      scanQueued = false;
      for (const frame of document.querySelectorAll(FRAME_SELECTOR)) {
        const image = frame.querySelector("img");
        // 표시만 있고 이미지가 없으면(조건부 렌더 실수) 기다릴 대상이 없다.
        // complete 는 실패한 이미지에도 true 다 — 어느 쪽이든 스켈레톤은 끝내야 한다.
        if (image === null || image.complete) {
          clearFrame(frame);
        }
      }
    };

    const queueScan = () => {
      if (scanQueued) {
        return;
      }
      scanQueued = true;
      requestAnimationFrame(scan);
    };

    scan();

    document.addEventListener("load", onSettled, true);
    document.addEventListener("error", onSettled, true);

    const mutationObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.addedNodes.length > 0) {
          queueScan();
          return;
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      document.removeEventListener("load", onSettled, true);
      document.removeEventListener("error", onSettled, true);
    };
  }, []);

  return null;
}
