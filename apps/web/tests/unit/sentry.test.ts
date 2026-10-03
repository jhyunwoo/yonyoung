import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubSentryEvent } from "../../lib/observability/sentry";

describe("Sentry event privacy", () => {
  it("keeps the stack while removing request credentials and user context", () => {
    const event: ErrorEvent = {
      type: undefined,
      exception: { values: [{ type: "Error", value: "unexpected failure" }] },
      request: {
        url: "https://example.com/page?token=secret#private",
        method: "POST",
        headers: { cookie: "secret" },
        data: { password: "secret" },
        query_string: "token=secret",
      },
      user: { email: "private@example.com", ip_address: "127.0.0.1" },
      extra: { password: "secret" },
      breadcrumbs: [{ message: "secret" }],
      contexts: {
        nextjs: { request_path: "/page?token=secret" },
        runtime: { name: "node" },
      },
    };
    const result = scrubSentryEvent(event);
    expect(result.request).toEqual({ url: "https://example.com/page", method: "POST" });
    expect(result.exception).toBe(event.exception);
    expect(JSON.stringify(result)).not.toMatch(/secret|private@/);
    expect(result.contexts?.runtime).toEqual({ name: "node" });
  });

  it("accepts errors with no request", () => {
    expect(scrubSentryEvent({ type: undefined, message: "failure" })).toEqual({
      message: "failure",
    });
  });
});
