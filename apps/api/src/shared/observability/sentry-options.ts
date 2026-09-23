import type { ErrorEvent } from "@sentry/cloudflare";

// Keep diagnostic stacks, but do not send request payloads or ambient user data.
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { method, url } = event.request;
    event.request = { method, url: url?.split(/[?#]/, 1)[0] };
  }
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  if (event.contexts) {
    delete event.contexts.nextjs;
  }
  return event;
}

export const sentryOptions = (env: {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_RELEASE?: string;
}) => ({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.SENTRY_ENVIRONMENT ?? "production",
  release: env.SENTRY_RELEASE,
  initialScope: { tags: { service: "api" } },
  sendDefaultPii: false,
  tracesSampleRate: 0,
  enableLogs: false,
  beforeSend: scrubSentryEvent,
});
