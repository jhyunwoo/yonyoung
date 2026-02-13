export function apiBaseUrl() {
  return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8787";
}

export function apiProxyBasePath() {
  return process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/proxy";
}
