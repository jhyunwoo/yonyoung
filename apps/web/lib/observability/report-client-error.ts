/**
 * 라우트 오류 경계(`error.tsx`)가 잡은 렌더 오류를 내부 수집 API 로 보낸다.
 *
 * 오류 경계까지 올라온 오류는 드물고 하나하나가 의미 있으므로 샘플링하지 않는다
 * (전역 핸들러의 샘플링은 `instrumentation-client.ts` 가 따로 한다).
 */
export const reportClientError = (error: Error): void => {
  navigator.sendBeacon(
    "/api/internal/client-error",
    new Blob(
      [
        JSON.stringify({
          event: "client.error",
          path: window.location.pathname,
          message: error.message,
          stack: error.stack,
          sampledAt: Date.now(),
        }),
      ],
      { type: "application/json; charset=UTF-8" },
    ),
  );
};
