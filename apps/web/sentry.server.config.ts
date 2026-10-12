import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/observability/sentry";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
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
    // 클라이언트가 RSC 응답 스트리밍 도중 연결을 끊으면(이동·탭 닫기·네트워크 단절) React가 렌더를 이 메시지로 중단한다. 서버 결함이 아니다.
    ignoreErrors: [/^The destination stream closed early\.$/],
    beforeSendLog: () => null,
    beforeSend: scrubSentryEvent,
  });
}
