import type { ErrorEvent } from "@sentry/nextjs";

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

const SENSITIVE_KEY_DENY_LIST = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * 서버·엣지·브라우저 SDK가 함께 쓰는 개인정보 보호 옵션. 런타임별 ignoreErrors·replay
 * 설정은 각 init에 둔다. 브라우저도 import하므로 SDK 값을 import하지 않는다(지연 로딩 유지).
 */
export const sentryPrivacyOptions = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: SENSITIVE_KEY_DENY_LIST },
      response: { deny: SENSITIVE_KEY_DENY_LIST },
    },
    httpBodies: [],
    urlQueryParams: { deny: SENSITIVE_KEY_DENY_LIST },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    graphQL: { document: false, variables: false },
  },
  tracesSampleRate: 0,
  beforeSendLog: () => null,
  beforeSend: scrubSentryEvent,
};
