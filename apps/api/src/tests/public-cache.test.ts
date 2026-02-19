import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLIC_CACHE_CONTROL,
  respondWithPublicCache,
  withPublicCacheHeaders,
} from "../lib/http/public-cache";
import type HonoAppType from "../types/honoAppType";
import type { Context } from "hono";

const createContext = (url = "https://example.com/api/public/activities") =>
  ({
    req: {
      url,
    },
  }) as Context<HonoAppType>;

describe("public cache helpers", () => {
  const originalCaches = (globalThis as { caches?: unknown }).caches;

  afterEach(() => {
    (globalThis as { caches?: unknown }).caches = originalCaches;
    vi.restoreAllMocks();
  });

  it("cache.put 실패 시에도 정상 응답을 반환한다", async () => {
    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => {
          throw new Error("cache write failed");
        }),
      },
    };

    const response = await respondWithPublicCache(createContext(), async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(PUBLIC_CACHE_CONTROL);
  });

  it("실패 응답은 cache-control 헤더를 주입하지 않는다", async () => {
    const response = withPublicCacheHeaders(
      new Response("boom", {
        status: 500,
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("캐시 hit 시 데이터 빌더를 다시 호출하지 않는다", async () => {
    const cached = new Response(JSON.stringify({ data: [{ id: "cached" }] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": PUBLIC_CACHE_CONTROL,
      },
    });

    const buildResponse = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "fresh" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    (globalThis as { caches?: unknown }).caches = {
      default: {
        match: vi.fn(async () => cached.clone()),
        put: vi.fn(async () => undefined),
      },
    };

    const response = await respondWithPublicCache(createContext(), buildResponse);

    expect(response.status).toBe(200);
    expect(buildResponse).not.toHaveBeenCalled();

    const body = (await response.json()) as { data: Array<{ id: string }> };
    expect(body.data[0]?.id).toBe("cached");
  });
});
