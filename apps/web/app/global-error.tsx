"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);
  return (
    <html lang="ko">
      <body>
        <h1>페이지를 불러오는 중 오류가 발생했습니다.</h1>
        <button data-testid="global-error-reset" type="button" onClick={reset}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
