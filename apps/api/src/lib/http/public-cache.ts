import { Context } from "hono";
import HonoAppType from "../../types/honoAppType";

const PUBLIC_CACHE_TTL_SECONDS = 60;
const PUBLIC_CACHE_STALE_REVALIDATE_SECONDS = 120;
export const PUBLIC_CACHE_CONTROL = `public, s-maxage=${PUBLIC_CACHE_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_CACHE_STALE_REVALIDATE_SECONDS}`;

const getDefaultCache = (): Cache | null => {
  const cacheStorage = (
    globalThis as typeof globalThis & {
      caches?: CacheStorage & { default?: Cache };
    }
  ).caches;
  return cacheStorage?.default ?? null;
};

const buildCacheRequest = (
  c: Context<HonoAppType>,
  path: string,
): Request => {
  const url = new URL(path, c.req.url);
  return new Request(url.toString(), { method: "GET" });
};

export const withPublicCacheHeaders = (response: Response): Response => {
  if (!response.ok) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const respondWithPublicCache = async (
  c: Context<HonoAppType>,
  buildResponse: () => Promise<Response>,
): Promise<Response> => {
  const cache = getDefaultCache();
  if (!cache) {
    return withPublicCacheHeaders(await buildResponse());
  }

  const cacheKey = new Request(c.req.url, { method: "GET" });

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  } catch {
    // ignore cache lookup failures and continue with origin response
  }

  const response = withPublicCacheHeaders(await buildResponse());
  if (!response.ok) {
    return response;
  }

  try {
    await cache.put(cacheKey, response.clone());
  } catch {
    // ignore cache write failures and continue with origin response
  }

  return response;
};

export const purgePublicCachePath = async (
  c: Context<HonoAppType>,
  path: string,
): Promise<void> => {
  const cache = getDefaultCache();
  if (!cache) {
    return;
  }

  const cacheKey = buildCacheRequest(c, path);
  try {
    await cache.delete(cacheKey);
  } catch {
    // ignore cache purge failures
  }
};
