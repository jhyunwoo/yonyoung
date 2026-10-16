"use client";

import { useEffect } from "react";
import { createEngagementTimer } from "@/features/public/analytics/engagement-timer";
import {
  createRandomId,
  createVisitIdentity,
} from "@/features/public/analytics/visitor-identity";
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from "@/shared/security/csrf";

type PageViewTrackerProps = {
  pageType: "home" | "activity" | "exhibition" | "about" | "donate" | "linktree";
  resourceId?: string;
};

/** API 상한과 같다. 넘는 값은 400이 되므로 보내기 전에 자른다. */
const MAX_ENGAGED_MS = 30 * 60 * 1000;

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
// 문서 로드당 한 번만 진입으로 보낸다. 클라이언트 내비게이션에서는 document.referrer가
// 첫 유입 경로로 남아 있어서, 매 페이지뷰마다 보내면 같은 유입이 중복으로 잡힌다.
let entryReported = false;

/**
 * 진입 정보. 같은 사이트에서 온 새로고침은 진입이 아니므로 null을 돌려준다.
 * 외부 유입은 경로·쿼리를 빼고 호스트명만 보낸다.
 */
const readEntry = (): { entry: true; referrerHost?: string } | null => {
  if (entryReported) return null;
  entryReported = true;

  if (document.referrer === "") return { entry: true };
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) return null;
    return { entry: true, referrerHost: referrer.hostname };
  } catch {
    return { entry: true };
  }
};

let visitIdentity: ReturnType<typeof createVisitIdentity> | null = null;

// localStorage 접근은 일부 브라우저 설정에서 getter 자체가 예외를 던진다.
const getVisitIdentity = () => {
  if (visitIdentity === null) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    visitIdentity = createVisitIdentity(storage);
  }
  return visitIdentity;
};

export default function PageViewTracker({ pageType, resourceId }: PageViewTrackerProps) {
  useEffect(() => {
    const post = (path: string, body: unknown): Promise<unknown> =>
      fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
        },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});

    const identity = getVisitIdentity();
    const pageviewId = createRandomId();
    const timer = createEngagementTimer(
      performance.now(),
      document.visibilityState === "visible",
    );
    let visitorId: string | null = null;
    let lastSentMs = 0;
    // 체류 갱신은 기존 행만 고친다. 페이지뷰 행보다 먼저 도착하면 사라지므로 기록이 끝난 뒤 보낸다.
    let pageViewRecorded: Promise<unknown> = Promise.resolve();

    // 누적 총량을 보낸다. 서버가 큰 값만 남기므로 탭을 여러 번 오가도 안전하다.
    const sendEngagement = () => {
      if (visitorId === null) return;
      const engagedMs = Math.min(
        Math.round(timer.total(performance.now())),
        MAX_ENGAGED_MS,
      );
      if (engagedMs <= lastSentMs) return;
      lastSentMs = engagedMs;
      identity.touch(Date.now());
      const body = { pageviewId, visitorId, engagedMs };
      void pageViewRecorded.then(() =>
        post("/api/public/page-views/engagement", body),
      );
    };

    const frame = requestAnimationFrame(() => {
      // 조회수 API — activity / exhibition 리소스만
      if ((pageType === "activity" || pageType === "exhibition") && resourceId) {
        void post("/api/public/views", { resourceType: pageType, resourceId });
      }

      const entry = readEntry();
      const visit = identity.resolve(Date.now());
      visitorId = visit.visitorId;
      // 세션 유입 경로는 문서 로드 첫 페이지뷰의 외부 리퍼러만 인정한다. 사이트 안 이동 뒤 시작된 세션은 직접 접속이다.
      const session = visit.sessionStart
        ? {
            sessionStart: true,
            ...(entry?.referrerHost !== undefined
              ? { sessionReferrerHost: entry.referrerHost }
              : {}),
          }
        : {};

      // 내부 Analytics Engine 집계
      pageViewRecorded = post("/api/public/page-views", {
        pageType,
        resourceId,
        ...entry,
        visitorId: visit.visitorId,
        sessionId: visit.sessionId,
        pageviewId,
        ...session,
      });
    });

    const onVisibilityChange = () => {
      const now = performance.now();
      if (document.visibilityState === "hidden") {
        timer.pause(now);
        sendEngagement();
      } else {
        timer.resume(now);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      timer.pause(performance.now());
      sendEngagement();
    };
  }, [pageType, resourceId]);

  return null;
}
