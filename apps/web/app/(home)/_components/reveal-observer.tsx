"use client";

import { useEffect } from "react";
import { rescanOnDocumentChange } from "./rescan-on-document-change";

/*
  등장 애니메이션 트리거 — 공개 레이아웃에 딱 하나만 둔다.

  IntersectionObserver 하나가 `[data-reveal]` 전부를 관찰하고, 화면에 들어온
  요소에 `data-reveal-shown` 을 붙인다. 나머지(투명도·이동·지연·감소 모드)는
  globals.css 가 처리한다.

  스트리밍으로 나중에 도착하는 Suspense 콘텐츠와 클라이언트 네비게이션으로
  갈아끼워지는 본문도 잡아야 하므로 문서가 바뀔 때마다 재스캔한다
  (`rescanOnDocumentChange`, 한 프레임에 한 번만).
*/
const REVEAL_SELECTOR = "[data-reveal]:not([data-reveal-shown])";
const ROOT_MARGIN = "-10% 0px";

export default function RevealObserver() {
  useEffect(() => {
    // 감소 모드에서는 CSS 가 처음부터 보이게 두므로 옵저버 자체가 필요 없다.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          // once 의미론: 한 번 보이면 계속 보인 채로 두고 관찰을 끊는다.
          entry.target.setAttribute("data-reveal-shown", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: ROOT_MARGIN },
    );

    const stopRescan = rescanOnDocumentChange(() => {
      for (const element of document.querySelectorAll(REVEAL_SELECTOR)) {
        observer.observe(element);
      }
    });

    return () => {
      stopRescan();
      observer.disconnect();
    };
  }, []);

  return null;
}
