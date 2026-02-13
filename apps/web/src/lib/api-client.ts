import type { ApiAppType } from "@yonyoung/api-app";
import { hc } from "hono/client";
import { apiBaseUrl, apiProxyBasePath } from "./env";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function createServerApiClient(baseUrl = apiBaseUrl()) {
  return hc<ApiAppType>(normalizeBaseUrl(baseUrl), {
    init: {
      cache: "no-store"
    }
  });
}

export function createBrowserApiClient(basePath = apiProxyBasePath()) {
  return hc<ApiAppType>(normalizeBaseUrl(basePath), {
    init: {
      cache: "no-store",
      credentials: "include"
    }
  });
}

export type ServerApiClient = ReturnType<typeof createServerApiClient>;
export type BrowserApiClient = ReturnType<typeof createBrowserApiClient>;
