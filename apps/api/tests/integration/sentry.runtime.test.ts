import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { instrumentSentryHandler } from "../../src/shared/observability/sentry-handler";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../src/app/middleware/errorHandler";
import { sentryOptions } from "../../src/shared/observability/sentry-options";
import type { Bindings } from "../../src/bindings/types";
import type HonoAppType from "../../src/types/honoAppType";

// An in-memory transport exercises the real Worker SDK without network traffic.
describe("Sentry Worker runtime", () => {
  it("flushes handled errors once and isolates concurrent request IDs", async () => {
    const envelopes: unknown[] = [];
    const app = new Hono<HonoAppType>();
    app.onError(errorHandler);
    app.get("/failure", async (c) => {
      c.set("requestId", c.req.header("x-request-id")!);
      await Promise.resolve();
      throw new Error("runtime failure");
    });
    const worker = instrumentSentryHandler(
      {
        fetch: async (request, env, ctx) => app.fetch(request, env, ctx),
      },
      (env: Bindings) => ({
        ...sentryOptions(env),
        transport: () => ({
          send: async (envelope: unknown) => {
            envelopes.push(envelope);
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
      }),
    );
    await Promise.all(
      ["first", "second"].map(async (id) => {
        const ctx = createExecutionContext();
        const response = await worker.fetch(
          new Request("https://example.com/failure?token=private-token", {
            headers: { "x-request-id": id, cookie: "private-cookie" },
          }),
          { SENTRY_DSN: "https://key@example.com/1" } as Bindings,
          ctx,
        );
        expect(response.status).toBe(500);
        await waitOnExecutionContext(ctx);
      }),
    );
    const serialized = envelopes.map((envelope) => JSON.stringify(envelope));
    const errors = serialized.filter((envelope) =>
      envelope.includes('"type":"event"'),
    );
    expect(errors).toHaveLength(2);
    expect(
      errors.filter((event) => event.includes('"requestId":"first"')),
    ).toHaveLength(1);
    expect(
      errors.filter((event) => event.includes('"requestId":"second"')),
    ).toHaveLength(1);
    expect(errors.join()).not.toMatch(/private-token|private-cookie/);
  });
});
