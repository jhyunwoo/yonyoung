import type * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/observability/sentry";

type BrowserSentry = typeof Sentry;
let initialization: Promise<BrowserSentry | null> | undefined;

/** DSN이 없으면 SDK 청크도 받지 않는다. 모든 브라우저 호출은 초기화를 공유한다. */
export function initializeBrowserSentry(): Promise<BrowserSentry | null> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return Promise.resolve(null);
  }

  initialization ??= import("@sentry/nextjs")
    .then((sentry) => {
      sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
        initialScope: { tags: { service: "web" } },
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: {
            request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
            response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
          },
          httpBodies: [],
          urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
          genAI: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          graphQL: { document: false, variables: false },
        },
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // 브라우저 확장 프로그램이 페이지 컨텍스트에서 남기는 rejection. 앱 코드는 extension API를 쓰지 않는다.
        ignoreErrors: [/runtime\.sendMessage\(\)/],
        beforeSendLog: () => null,
        beforeSend: scrubSentryEvent,
      });
      return sentry;
    })
    // SDK 다운로드/초기화 실패가 또 다른 unhandledrejection을 만들지 않게 한다.
    .catch(() => null);

  return initialization;
}

export async function captureBrowserException(error: unknown): Promise<void> {
  try {
    const sentry = await initializeBrowserSentry();
    sentry?.captureException(error);
  } catch {
    // 오류 화면의 재시도와 기존 오류 beacon은 SDK 상태와 무관하게 동작해야 한다.
  }
}
