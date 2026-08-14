import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import {
  apiActivitySchema,
  apiAttachmentSchema,
  apiExhibitionSchema,
  apiGenerationSchema,
  apiLinktreeSchema,
  apiPublicGenerationWithMembersSchema,
  apiRecruitingPlanSchema,
  apiSiteSettingsSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiActivity,
  ApiAttachment,
  ApiAttachmentScope,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiPublicGenerationWithMembers,
  ApiRecruitingPlan,
  ApiSiteSettings,
} from "@/shared/contracts/api-contracts";
import { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api-contracts";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";
import { CACHE_TAGS } from "@/server/cache/tags";
import { logger } from "@/server/observability/logger";
import { pickFeaturedPublicExhibition } from "@/features/public/model/public-exhibition";

export const PUBLIC_CACHE_TAGS = CACHE_TAGS.public;

/**
 * 아카이브(활동·전시·기수·사진가·첨부)의 캐시 수명.
 *
 * 관리자 쓰기가 성공하면 `updateTag`로 즉시 무효화하므로(`server/cache/tags.ts`)
 * 만료에 기대어 신선도를 유지할 필요가 없다. 길게 잡을수록 API 왕복이 줄고,
 * `stale`이 충분히 길어야 이 결과가 라우트의 App Shell(정적 셸)에 포함된다.
 */
const ARCHIVE_CACHE_PROFILE = "days";

/** 운영 중 손으로 자주 바꾸는 설정성 데이터(사이트 설정·링크트리·리크루팅)의 캐시 수명. */
const SETTINGS_CACHE_PROFILE = "hours";

type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const readPublic = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
  return honoRequest<T>({
    path,
    method: "GET",
    responseSchema: schema,
    timeoutMs: 10_000,
  });
};

const readPublicWithFallback = async <T>(input: {
  path: string;
  schema: z.ZodType<T>;
  fallback: T;
  event: string;
}): Promise<T> => {
  try {
    return await readPublic<T>(input.path, input.schema);
  } catch (error) {
    logger.warn({
      event: input.event,
      route: input.path,
      method: "GET",
      status: error instanceof HonoApiError ? error.status : 500,
      error:
        error instanceof HonoApiError
          ? {
              code: error.code,
              requestId: error.requestId,
              message: error.message,
            }
          : {
              message: error instanceof Error ? error.message : "Unknown error",
            },
    });

    return input.fallback;
  }
};

export const listPublicActivities = async (): Promise<ApiActivity[]> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.activities);

  return readPublicWithFallback({
    path: "/api/public/activities",
    schema: z.array(apiActivitySchema),
    fallback: [],
    event: "public.activities.read_fallback",
  });
};

export const getPublicActivityById = async (id: string): Promise<ApiActivity> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.activities);

  return readPublic<ApiActivity>(`/api/public/activities/${id}`, apiActivitySchema);
};

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  return readPublicWithFallback({
    path: "/api/public/exhibitions",
    schema: z.array(apiExhibitionSchema),
    fallback: [],
    event: "public.exhibitions.read_fallback",
  });
};

export const getPublicExhibitionById = async (id: string): Promise<ApiExhibition> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  return readPublic<ApiExhibition>(`/api/public/exhibitions/${id}`, apiExhibitionSchema);
};

/**
 * 홈 히어로에 노출할 전시를 서버에서 고른다.
 *
 * 선택 기준이 "지금"에 의존하므로(`pickFeaturedPublicExhibition`) 예전에는 클라이언트
 * `useEffect`에서 다시 계산했고, 그 탓에 서버가 그린 히어로 이미지가 하이드레이션 후
 * 다른 이미지로 교체되면서 LCP 이미지를 두 번 받았다. cacheComponents에서는 `Date.now()`를
 * `"use cache"` 스코프 안에서 쓰는 것이 허용된 해법이라, 시간을 캐시 경계 안에 가두고
 * 서버에서 한 번만 고른다. 전시 일정이 시간 단위보다 자주 바뀌지는 않는다.
 */
export const getFeaturedPublicExhibition = async (): Promise<ApiExhibition | null> => {
  "use cache";

  cacheLife(SETTINGS_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  return pickFeaturedPublicExhibition(await listPublicExhibitions());
};

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> => {
  "use cache";

  cacheLife(SETTINGS_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.linktree);

  return readPublicWithFallback({
    path: "/api/public/linktree",
    schema: z.array(apiLinktreeSchema),
    fallback: [],
    event: "public.linktree.read_fallback",
  });
};

export const getPublicSiteSettings = async (): Promise<ApiSiteSettings> => {
  "use cache";

  cacheLife(SETTINGS_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.siteSettings);

  return readPublicWithFallback({
    path: "/api/public/site-settings",
    schema: apiSiteSettingsSchema,
    fallback: DEFAULT_SITE_SETTINGS,
    event: "public.site-settings.read_fallback",
  });
};

/**
 * 공개 첨부파일 목록 조회 (후원 페이지 자료, 활동별 자료).
 * 조회 실패 시 빈 배열로 폴백해 페이지 렌더링을 막지 않습니다.
 */
export const getPublicAttachments = async (
  scope: ApiAttachmentScope,
  resourceId?: string,
): Promise<ApiAttachment[]> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.attachments);

  const query = new URLSearchParams({ scope });
  if (resourceId) {
    query.set("resourceId", resourceId);
  }

  return readPublicWithFallback({
    path: `/api/public/attachments?${query.toString()}`,
    schema: z.array(apiAttachmentSchema),
    fallback: [],
    event: "public.attachments.read_fallback",
  });
};

export const getPublicCurrentRecruitingPlan =
  async (): Promise<ApiRecruitingPlan | null> => {
    "use cache";

    cacheLife(SETTINGS_CACHE_PROFILE);
    cacheTag(PUBLIC_CACHE_TAGS.recruitingPlan);

    return readPublicWithFallback({
      path: "/api/public/recruiting-plan/current",
      schema: apiRecruitingPlanSchema.nullable(),
      fallback: null,
      event: "public.recruiting-plan.read_fallback",
    });
  };

export const listPublicGenerations = async (): Promise<ApiGeneration[]> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.generations);

  return readPublicWithFallback({
    path: "/api/public/generations",
    schema: z.array(apiGenerationSchema),
    fallback: [],
    event: "public.generations.read_fallback",
  });
};

export const listPublicPhotographers = async (): Promise<
  ApiPublicGenerationWithMembers[]
> => {
  "use cache";

  cacheLife(ARCHIVE_CACHE_PROFILE);
  cacheTag(PUBLIC_CACHE_TAGS.photographers);

  return readPublicWithFallback({
    path: "/api/public/photographers",
    schema: z.array(apiPublicGenerationWithMembersSchema),
    fallback: [],
    event: "public.photographers.read_fallback",
  });
};

export const flattenLinktreeItems = (linktrees: ApiLinktree[]): PublicLinkItem[] => {
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
