import * as Sentry from "@sentry/nextjs";
import { sentryPrivacyOptions } from "@/lib/observability/sentry";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    initialScope: { tags: { service: "web" } },
    ...sentryPrivacyOptions,
    // 클라이언트가 RSC 응답 스트리밍 도중 연결을 끊으면(이동·탭 닫기·네트워크 단절) React가 렌더를 이 메시지로 중단한다. 서버 결함이 아니다.
    ignoreErrors: [/^The destination stream closed early\.$/],
  });
}
