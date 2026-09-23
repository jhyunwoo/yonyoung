import { withScope, withSentry } from "@sentry/cloudflare";
import type { CloudflareOptions } from "@sentry/cloudflare";
import type { Bindings } from "../../bindings/types";
import { sentryOptions } from "./sentry-options";

type FetchHandler = {
  fetch(
    request: Request,
    env: Bindings,
    ctx: ExecutionContext,
  ): Promise<Response>;
};

export function instrumentSentryHandler(
  handler: FetchHandler,
  options: (env: Bindings) => CloudflareOptions = sentryOptions,
): FetchHandler {
  const instrumented = withSentry(options, handler);
  return {
    // SDK 10.75's invocation wrapper isolates the isolation scope, but reuses
    // the current scope. Clone it before init binds a client so concurrent
    // requests cannot overwrite one another's client or deduplication state.
    fetch: (request, env, ctx) =>
      withScope(() => instrumented.fetch(request, env, ctx)),
  };
}
