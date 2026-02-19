import type {
  ApiActivity,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiSupporter,
  DataEnvelope,
} from "@repo/shared-api-contracts";
import {
  clearTimeoutController,
  createTimeoutController,
  isRecord,
  normalizePath,
  resolveBaseUrl,
} from "@repo/shared-http";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const REQUEST_TIMEOUT_MS = 10_000;
const IS_E2E_MODE = Boolean(process.env.E2E_SUITE_MODE);

export const PUBLIC_CACHE_TAGS = {
  activities: "public:activities",
  exhibitions: "public:exhibitions",
  supporters: "public:supporters",
  linktree: "public:linktree",
  generations: "public:generations",
} as const;

type PublicGetOptions = {
  useNoStore?: boolean;
  revalidateSeconds?: number;
  tags?: string[];
};

export type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const resolvePublicApiBaseUrl = (): string =>
  resolveBaseUrl(
    IS_E2E_MODE
      ? [
          process.env.E2E_API_URL,
          process.env.AUTH_API_URL,
          process.env.NEXT_PUBLIC_AUTH_API_URL,
        ]
      : [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
    DEFAULT_AUTH_API_URL,
  );

const resolvePublicApiUrl = (path: string): string =>
  `${resolvePublicApiBaseUrl()}${normalizePath(path)}`;

const addCacheBuster = (url: string): string => {
  const cacheBuster = `_e2e=${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return `${url}${url.includes("?") ? "&" : "?"}${cacheBuster}`;
};

const parseEnvelope = <T>(value: unknown): T => {
  if (!isRecord(value) || !("data" in value)) {
    throw new Error("공개 API 응답 형식이 올바르지 않습니다.");
  }

  return (value as DataEnvelope<T>).data;
};

const publicGet = async <T>(
  path: string,
  options?: PublicGetOptions,
): Promise<T> => {
  const { controller, timeoutId } = createTimeoutController(REQUEST_TIMEOUT_MS);
  const revalidateSeconds = options?.revalidateSeconds ?? 60;

  const requestCacheOptions = options?.useNoStore || IS_E2E_MODE
    ? ({ cache: "no-store" } as const)
    : ({
        next: {
          revalidate: revalidateSeconds,
          tags: options?.tags,
        },
      } as const);

  try {
    const targetUrl = IS_E2E_MODE
      ? addCacheBuster(resolvePublicApiUrl(path))
      : resolvePublicApiUrl(path);

    const response = await fetch(targetUrl, {
      method: "GET",
      ...requestCacheOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`공개 API 요청 실패 (${response.status})`);
    }

    const body = (await response.json()) as unknown;
    return parseEnvelope<T>(body);
  } finally {
    clearTimeoutController(timeoutId);
  }
};

export const listPublicActivities = async (): Promise<ApiActivity[]> =>
  publicGet<ApiActivity[]>("/api/public/activities", {
    revalidateSeconds: 60,
    tags: [PUBLIC_CACHE_TAGS.activities],
  });

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> =>
  publicGet<ApiExhibition[]>("/api/public/exhibitions", {
    revalidateSeconds: 60,
    tags: [PUBLIC_CACHE_TAGS.exhibitions],
  });

export const listPublicSupporters = async (): Promise<ApiSupporter[]> =>
  publicGet<ApiSupporter[]>("/api/public/supporters", {
    revalidateSeconds: 30,
    tags: [PUBLIC_CACHE_TAGS.supporters],
  });

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> =>
  publicGet<ApiLinktree[]>("/api/public/linktree", {
    revalidateSeconds: 120,
    tags: [PUBLIC_CACHE_TAGS.linktree],
  });

export const listPublicGenerations = async (): Promise<ApiGeneration[]> =>
  publicGet<ApiGeneration[]>("/api/public/generations", {
    revalidateSeconds: 300,
    tags: [PUBLIC_CACHE_TAGS.generations],
  });

export const flattenLinktreeItems = (
  linktrees: ApiLinktree[],
): PublicLinkItem[] => {
  return linktrees.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupName: group.name,
    })),
  );
};

export const safeList = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await loader();
  } catch {
    return fallback;
  }
};
