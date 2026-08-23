"use client";

import { useEffect } from "react";

/** 헤더에 테두리·그림자를 붙이기 시작하는 스크롤 위치(px). */
const SCROLLED_THRESHOLD_PX = 50;

/**
 * "페이지가 스크롤됐다"를 `<html data-public-scrolled>` 로 알리는 아일랜드.
 *
 * 예전에는 헤더 전체가 클라이언트 컴포넌트였고 `window.scroll` 리스너의 상태를
 * React state 로 들고 있었다. 스크롤할 때마다 헤더 트리가 리렌더되므로 저사양
 * 기기에서 그대로 메인 스레드 비용이 된다.
 *
 * 여기서는 스크롤 리스너 자체를 없애고 IntersectionObserver 를 쓴다. 문서 맨 위에
 * 높이 50px 짜리 감시용 요소를 두고, 그것이 뷰포트를 벗어나는 순간이 정확히
 * `scrollY > 50` 이다. 값은 CSS 가 읽으므로 React 리렌더가 0회다.
 *
 * 감시용 요소는 `position: absolute` 지만 위치 지정된 조상이 없어 초기 컨테이닝
 * 블록(문서 원점 기준)에 걸린다. 그래서 문서와 함께 스크롤돼 올라간다 —
 * `position: fixed` 인 헤더 안에 두면 절대 뷰포트를 벗어나지 않으므로,
 * 반드시 헤더 바깥(=body 직속)에 두어야 한다.
 */
export default function SiteHeaderScrollState() {
  useEffect(() => {
    const sentinel = document.getElementById("public-header-scroll-sentinel");
    if (!sentinel) {
      return;
    }

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          root.toggleAttribute("data-public-scrolled", !entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      root.removeAttribute("data-public-scrolled");
    };
  }, []);

  return (
    <div
      id="public-header-scroll-sentinel"
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 w-px"
      style={{ height: `${SCROLLED_THRESHOLD_PX}px` }}
    />
  );
}
