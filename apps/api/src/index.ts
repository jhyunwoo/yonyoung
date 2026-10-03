import { instrumentSentryHandler } from "./shared/observability/sentry-handler";
import { WorkerEntrypoint } from "cloudflare:workers";
import { createApp } from "./app";
import type { Bindings } from "./bindings/types";
import { resolveD1Database } from "./infra/db/client";
import { resolveR2Bucket } from "./infra/r2/client";
import { runR2OrphanSweep } from "./lib/storage/orphan-sweep";
import { logger } from "./shared/logging/logger";

const app = createApp();
const monitoredApp = instrumentSentryHandler({
  fetch: async (request, env, ctx) => app.fetch(request, env, ctx),
});

const isPublicApiRequest = (request: Request): boolean => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  return new URL(request.url).pathname.startsWith("/api/public/");
};

const readRequestId = (request: Request): string =>
  request.headers.get("x-request-id")?.trim() ||
  request.headers.get("cf-ray")?.trim() ||
  crypto.randomUUID();

const createAnonymousPublicRequest = (
  request: Request,
  requestId: string,
): Request => {
  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  headers.set("x-request-id", requestId);

  return new Request(request, { headers });
};

const addGatewayTiming = (
  response: Response,
  input: {
    requestId: string;
    startedAt: number;
  },
): Response => {
  const durationMs = performance.now() - input.startedAt;
  const headers = new Headers(response.headers);
  headers.set("X-Request-Id", input.requestId);
  headers.set("X-Correlation-Id", input.requestId);
  headers.set("X-Response-Time", `${durationMs.toFixed(2)}ms`);
  headers.set("Server-Timing", `total;dur=${durationMs.toFixed(2)}`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Public-only cached entrypoint. Wrangler enables Workers Caching exclusively
 * for this class, so authenticated/admin routes never pay a cache lookup or
 * risk being stored. The Hono app still applies validation, CORS, and security
 * middleware on cache misses.
 */
export class PublicApi extends WorkerEntrypoint<Bindings> {
  override async fetch(request: Request): Promise<Response> {
    return monitoredApp.fetch(request, this.env, this.ctx);
  }
}

const monitoredGateway = instrumentSentryHandler({
  async fetch(
    request: Request,
    env: Bindings,
    ctx: ExecutionContext,
  ): Promise<Response> {
    if (!isPublicApiRequest(request)) {
      return app.fetch(request, env, ctx);
    }

    const startedAt = performance.now();
    const requestId = readRequestId(request);
    const response = await ctx.exports.PublicApi.fetch(
      createAnonymousPublicRequest(request, requestId),
    );

    return addGatewayTiming(response, { requestId, startedAt });
  },
});

/**
 * 매일 한 번 R2 고아 객체를 정리한다(`wrangler.jsonc`의 triggers.crons).
 * 기본은 dry-run이며 `R2_ORPHAN_SWEEP_ENABLED="true"`일 때만 실제로 삭제한다.
 */
const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (
  _controller,
  env,
  ctx,
) => {
  ctx.waitUntil(
    (async () =>
      runR2OrphanSweep({
        database: resolveD1Database(env),
        bucket: resolveR2Bucket(env),
        enabled: env.R2_ORPHAN_SWEEP_ENABLED === "true",
      }))().catch((error: unknown) => {
      logger.error({
        event: "r2.orphan_sweep.failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }),
  );
};

export default {
  fetch: monitoredGateway.fetch,
  scheduled,
} satisfies ExportedHandler<Bindings>;
