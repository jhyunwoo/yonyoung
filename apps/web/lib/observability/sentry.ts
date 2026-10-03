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
