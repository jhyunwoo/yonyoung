import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev } from "wrangler";

let worker:
  | Awaited<ReturnType<typeof unstable_dev>>
  | null = null;

describe("worker runtime integration", () => {
  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      config: "wrangler.jsonc",
      localProtocol: "http",
      vars: {
        BETTER_AUTH_URL: "http://localhost:8787",
        BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (worker) {
      await worker.stop();
      worker = null;
    }
  });

  it(
    "/message responds in Workers runtime with request tracking headers",
    async () => {
      const response = await worker!.fetch("/message");

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Hello Hono!");
      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("server-timing")).toContain("total;dur=");
    },
    15_000,
  );

  it(
    "/api/* not-found responses still include edge security headers",
    async () => {
      const response = await worker!.fetch("/api/unknown-endpoint");

      expect(response.status).toBe(404);
      expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
    15_000,
  );
});
