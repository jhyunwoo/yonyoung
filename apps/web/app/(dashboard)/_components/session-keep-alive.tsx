"use client";

import { useEffect } from "react";

const SESSION_REFRESHED_AT_KEY = "yonyoung:session-refreshed-at";
/** Better Auth는 세션이 하루 이상 지나면 조회 때 만료를 연장한다(updateAge 기본 1일). */
const SESSION_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

const readLastRefreshedAt = (): number | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_REFRESHED_AT_KEY);
    const parsed = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const recordRefreshedAt = (at: number): boolean => {
  try {
    window.localStorage.setItem(SESSION_REFRESHED_AT_KEY, String(at));
    return true;
  } catch {
    return false;
  }
};

/**
 * 로그인 쿠키를 주기적으로 갱신한다.
 *
 * 대시보드의 세션 확인은 서버 컴포넌트가 API를 직접 호출하는데, 서버 컴포넌트는 쿠키를
 * 쓸 수 없어 Better Auth가 돌려준 갱신 쿠키(Set-Cookie)가 브라우저에 닿지 않는다. 그러면
 * DB 세션은 연장돼도 브라우저 쿠키는 로그인 때의 만료(7일)를 그대로 가져, 매일 쓰는
 * 관리자도 7일마다 로그아웃된다. 이 아일랜드가 12시간에 한 번 인증 프록시로
 * get-session을 호출해 갱신 쿠키를 브라우저에 받는다.
 *
 * 처음 본 브라우저는 시각만 기록하고 요청하지 않는다(방금 로그인했다면 쿠키가 새것이다).
 * 대시보드 진입마다 세션 왕복을 늘리지 않기 위함이다.
 */
export default function SessionKeepAlive() {
  useEffect(() => {
    const now = Date.now();
    const lastRefreshedAt = readLastRefreshedAt();
    if (lastRefreshedAt === null) {
      recordRefreshedAt(now);
      return;
    }

    if (now - lastRefreshedAt < SESSION_REFRESH_INTERVAL_MS) {
      return;
    }

    // 저장소를 쓸 수 없으면 매 진입마다 요청하게 되므로 아예 건너뛴다.
    if (!recordRefreshedAt(now)) {
      return;
    }

    void fetch("/api/auth/get-session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    }).catch(() => undefined);
  }, []);

  return null;
}
