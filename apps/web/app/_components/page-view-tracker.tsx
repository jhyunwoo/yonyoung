"use client";

import { useEffect } from "react";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

type PageViewTrackerProps = {
  pageType: "home" | "activity" | "exhibition" | "about" | "donate" | "linktree";
  resourceId?: string;
};

/**
 * 페이지뷰 집계.
 *
 * **반드시 `useEffect` 안에서만 보낸다.** 프리페치나 App Shell 생성 시점에 실행되면
 * 실제로 보지 않은 페이지가 조회수로 잡힌다. 렌더 중이나 서버에서 부르는 형태로
 * 바꾸지 말 것.
 *
 * `navigator.sendBeacon` 을 쓰지 않는 이유: API 가 CSRF 헤더를 요구하는데 beacon 은
 * 커스텀 헤더를 붙일 수 없다. 대신 `keepalive` 로 같은 성질(페이지를 떠나도 전송이
 * 살아남음)을 얻는다.
 *
 * 전송 시점을 한 프레임 미루는 이유: 하이드레이션 커밋과 같은 프레임에서 요청을
 * 띄우면 첫 화면 이미지와 대역폭·연결을 다투게 된다. 한 프레임(≈16ms)이면 첫
 * 페인트 뒤로 밀리면서도, 사용자가 그 사이에 페이지를 떠나 집계가 누락될 위험은
 * 사실상 없다(`keepalive` 가 남은 경우도 처리한다).
 */
export default function PageViewTracker({ pageType, resourceId }: PageViewTrackerProps) {
  useEffect(() => {
    const post = (path: string, body: unknown) => {
      fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});
    };

    const frame = requestAnimationFrame(() => {
      // 조회수 API — activity / exhibition 리소스만
      if ((pageType === "activity" || pageType === "exhibition") && resourceId) {
        post("/api/public/views", { resourceType: pageType, resourceId });
      }

      // 내부 Analytics Engine 집계
      post("/api/public/page-views", { pageType, resourceId });
    });

    return () => cancelAnimationFrame(frame);
  }, [pageType, resourceId]);

  return null;
}
