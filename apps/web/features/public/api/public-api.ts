import type {
  ApiActivity,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiPublicGenerationWithMembers,
  ApiRecruitingPlan,
  ApiSiteSettings,
  DataEnvelope,
} from "@/shared/contracts/api-contracts";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import {
  clearTimeoutController,
  createTimeoutController,
  isRecord,
  normalizePath,
  resolveBaseUrl,
} from "@/shared/http/http";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const DEFAULT_PRODUCTION_AUTH_API_URL = "https://api.yonyoung.moveto.kr";
const REQUEST_TIMEOUT_MS = 10_000;
const IS_E2E_MODE = Boolean(process.env.E2E_SUITE_MODE);

export const PUBLIC_CACHE_TAGS = {
  activities: "public:activities",
  exhibitions: "public:exhibitions",
  linktree: "public:linktree",
  generations: "public:generations",
  photographers: "public:photographers",
  recruitingPlan: "public:recruiting-plan",
  siteSettings: "public:site-settings",
} as const;

type PublicGetOptions = {
  useNoStore?: boolean;
  revalidateSeconds?: number;
  tags?: string[];
};

type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const resolvePublicApiBaseUrl = (): string =>
  {
    if (IS_E2E_MODE) {
      return resolveBaseUrl(
        [
          process.env.E2E_API_URL,
          process.env.AUTH_API_URL,
          process.env.NEXT_PUBLIC_AUTH_API_URL,
        ],
        DEFAULT_AUTH_API_URL,
      );
    }

    if (process.env.NODE_ENV === "production") {
      return resolveBaseUrl(
        [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
        DEFAULT_PRODUCTION_AUTH_API_URL,
      );
    }

    return resolveBaseUrl(
      [process.env.AUTH_API_URL, process.env.NEXT_PUBLIC_AUTH_API_URL],
      DEFAULT_AUTH_API_URL,
    );
  };

const resolvePublicApiUrl = (path: string): string =>
  `${resolvePublicApiBaseUrl()}${normalizePath(path)}`;

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
    const targetUrl = resolvePublicApiUrl(path);

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
  {
    try {
      return await publicGet<ApiActivity[]>("/api/public/activities", {
        revalidateSeconds: 60,
        tags: [PUBLIC_CACHE_TAGS.activities],
      });
    } catch {
      return [];
    }
  };

export const getPublicActivityById = async (id: string): Promise<ApiActivity> =>
  {
    return publicGet<ApiActivity>(`/api/public/activities/${id}`, {
      revalidateSeconds: 60,
      tags: [PUBLIC_CACHE_TAGS.activities],
    });
  };

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> =>
  {
    try {
      return await publicGet<ApiExhibition[]>("/api/public/exhibitions", {
        revalidateSeconds: 60,
        tags: [PUBLIC_CACHE_TAGS.exhibitions],
      });
    } catch {
      return [];
    }
  };

export const getPublicExhibitionById = async (id: string): Promise<ApiExhibition> =>
  {
    return publicGet<ApiExhibition>(`/api/public/exhibitions/${id}`, {
      revalidateSeconds: 60,
      tags: [PUBLIC_CACHE_TAGS.exhibitions],
    });
  };

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> =>
  {
    try {
      return await publicGet<ApiLinktree[]>("/api/public/linktree", {
        revalidateSeconds: 120,
        tags: [PUBLIC_CACHE_TAGS.linktree],
      });
    } catch {
      return [];
    }
  };

export const getPublicSiteSettings = async (): Promise<ApiSiteSettings> =>
  {
    try {
      return await publicGet<ApiSiteSettings>("/api/public/site-settings", {
        revalidateSeconds: 120,
        tags: [PUBLIC_CACHE_TAGS.siteSettings],
      });
    } catch {
      return DEFAULT_SITE_SETTINGS;
    }
  };

export const getPublicCurrentRecruitingPlan = async (): Promise<ApiRecruitingPlan | null> =>
  {
    try {
      return await publicGet<ApiRecruitingPlan | null>("/api/public/recruiting-plan/current", {
        revalidateSeconds: 120,
        tags: [PUBLIC_CACHE_TAGS.recruitingPlan],
      });
    } catch {
      return null;
    }
  };

export const listPublicGenerations = async (): Promise<ApiGeneration[]> =>
  {
    try {
      return await publicGet<ApiGeneration[]>("/api/public/generations", {
        revalidateSeconds: 300,
        tags: [PUBLIC_CACHE_TAGS.generations],
      });
    } catch {
      return [];
    }
  };

export const listPublicPhotographers = async (): Promise<
  ApiPublicGenerationWithMembers[]
> =>
  {
    try {
      return await publicGet<ApiPublicGenerationWithMembers[]>("/api/public/photographers", {
        revalidateSeconds: 300,
        tags: [PUBLIC_CACHE_TAGS.photographers],
      });
    } catch {
      return [];
    }
  };

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
