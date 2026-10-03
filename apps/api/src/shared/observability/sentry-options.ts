import type { CloudflareOptions, ErrorEvent } from "@sentry/cloudflare";

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
}): CloudflareOptions => ({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  // Keep clients and deduplication state local to each Worker invocation.
  cacheClient: false,
  environment: env.SENTRY_ENVIRONMENT ?? "production",
  release: env.SENTRY_RELEASE,
  initialScope: { tags: { service: "api" } },
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
  beforeSendLog: () => null,
  beforeSend: scrubSentryEvent,
});
