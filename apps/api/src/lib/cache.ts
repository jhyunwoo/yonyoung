import type { AppEnv } from "@yonyoung/db";

export async function readThroughJsonCache<T>(
  env: AppEnv,
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = await env.CACHE.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const value = await factory();
  await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return value;
}

export async function bustPrefix(env: AppEnv, prefix: string) {
  const list = await env.CACHE.list({ prefix });
  await Promise.all(list.keys.map((entry: { name: string }) => env.CACHE.delete(entry.name)));
}
