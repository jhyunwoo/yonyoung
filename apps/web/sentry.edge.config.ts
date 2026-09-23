import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/observability/sentry";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    initialScope: { tags: { service: "web" } },
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableLogs: false,
    beforeSend: scrubSentryEvent,
  });
}
