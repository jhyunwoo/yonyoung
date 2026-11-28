import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { logger } from "@/server/observability/logger";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
  logger.info({
    event: "instrumentation.register",
  });
}

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
};

// 요청 헤더를 통째로 남기면 방문자 IP와 Referer 쿼리(서명된 동의 주소 등)가 로그에 쌓인다.
// 요청을 추적하는 데 필요한 것만 남긴다.
const LOGGED_REQUEST_HEADERS = [
  "x-request-id",
  "x-trace-id",
  "content-type",
  "user-agent",
];

const pickLoggedHeaders = (
  headers: Record<string, string | string[] | undefined>,
): Record<string, string | string[]> => {
  const picked: Record<string, string | string[]> = {};
  for (const name of LOGGED_REQUEST_HEADERS) {
    const value = headers[name];
    if (value !== undefined) {
      picked[name] = value;
    }
  }
  return picked;
};

export const onRequestError: Instrumentation.onRequestError = (
  error,
  errorRequest,
  errorContext,
) => {
  // 없는 경로로 온 POST는 스캐너다(.php, .jsp 업로드 시도 등). Next가 multipart 본문을 서버 액션으로
  // 파싱하다 던지는 오류라 사이트 결함이 아니다(YONYOUNG-WEB-2·4·5·6). 로그에는 남긴다.
  const isProbeToMissingRoute =
    errorRequest.method === "POST" && errorContext.routePath === "/_not-found/page";
  if (!isProbeToMissingRoute) {
    Sentry.captureRequestError(error, errorRequest, errorContext);
  }
  logger.error({
    event: "request.error",
    route: errorContext.routePath,
    method: errorRequest.method,
    error: serializeError(error),
    request: {
      // 쿼리에는 OAuth code·state나 서명 값이 실릴 수 있어 경로만 남긴다.
      path: errorRequest.path.split("?", 1)[0],
      headers: pickLoggedHeaders(errorRequest.headers),
      context: errorContext,
    },
  });
};
