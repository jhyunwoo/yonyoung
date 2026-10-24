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
} from "@yonyoung/contracts/schemas";
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
} from "@yonyoung/contracts";
import { DEFAULT_SITE_SETTINGS } from "@yonyoung/contracts";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";
import { toFreshPublicReadPath } from "@/server/http/fresh-public-read";
import { CACHE_TAGS, publicActivityTag, publicExhibitionTag } from "@/server/cache/tags";
import { logger } from "@/server/observability/logger";
import { pickFeaturedPublicExhibition } from "@/features/public/model/public-exhibition";

const PUBLIC_CACHE_TAGS = CACHE_TAGS.public;

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

/**
 * 조회에 실패해 폴백 값을 돌려줄 때의 캐시 수명.
 *
 * 폴백(빈 목록·기본 설정)을 정상 응답과 같은 `days`/`hours`로 캐시하면 API 장애가 끝난
 * 뒤에도 그 수명 동안 빈 화면이 남는다. 짧아야 다음 재검증에서 다시 시도한다. 다만
 * `expire`가 5분보다 짧은 프로필(`seconds`)은 프리렌더에서 동적 입력으로 취급되므로
 * `minutes`다(`features/seo/og/og-cover-image.ts`의 실패 수명과 같은 이유).
 */
const FAILURE_CACHE_PROFILE = "minutes";

type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const readPublic = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
  return honoRequest<T>({
    path: toFreshPublicReadPath(path),
    method: "GET",
    responseSchema: schema,
    timeoutMs: 10_000,
  });
};

/**
 * 폴백 여부를 결과와 함께 돌려준다. 캐시 함수는 `ok`를 보고 `cacheLife`를 한 번만 고른다 —
 * `cacheLife`는 여러 번 부르면 가장 짧은 값이 남으므로 미리 긴 수명을 걸어 둘 수 없다.
 * 분기마다 따로 부르는 이유: 빌드가 생성하는 `cacheLife` 타입은 프로필마다 오버로드가 따로라
 * `ok ? "days" : "minutes"` 같은 합집합 인자를 받지 않는다.
 */
type PublicReadResult<T> = { ok: boolean; data: T };

const readPublicWithFallback = async <T>(input: {
  path: string;
  schema: z.ZodType<T>;
  fallback: T;
  event: string;
}): Promise<PublicReadResult<T>> => {
  try {
    return { ok: true, data: await readPublic<T>(input.path, input.schema) };
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

    return { ok: false, data: input.fallback };
  }
};

/**
 * 상세 하나를 읽는다. 형식이 틀린 id(400)나 없는·비공개 게시물(404)은 던지지 않고 `null`이다.
 * 던지면 페이지가 잡아도 id 자리에 `abc`가 온 상세 주소가 렌더 오류로 보고됐다(YONYOUNG-WEB-C).
 * 없다는 결과는 폴백처럼 짧게만 캐시한다. 그 밖의 실패는 던져서 캐시하지 않는다.
 */
const readPublicDetail = async <T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T | null> => {
  try {
    return await readPublic<T>(path, schema);
  } catch (error) {
    if (error instanceof HonoApiError && (error.status === 400 || error.status === 404)) {
      return null;
    }
    throw error;
  }
};

export const listPublicActivities = async (): Promise<ApiActivity[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.activities);

  const result = await readPublicWithFallback({
    path: "/api/public/activities",
    schema: z.array(apiActivitySchema),
    fallback: [],
    event: "public.activities.read_fallback",
  });
  if (result.ok) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
};

/**
 * 활동 하나의 상세.
 *
 * 컬렉션 태그(`public:activities`)를 붙이지 않고 엔티티 태그만 붙인다. 활동 A 를
 * 고쳤을 때 B·C·D 의 상세 캐시까지 버리지 않기 위해서다 — 자세한 근거와, 이를
 * 고정하는 테스트는 `server/cache/tags.ts` 주석 참고.
 */
export const getPublicActivityById = async (id: string): Promise<ApiActivity | null> => {
  "use cache";

  cacheTag(publicActivityTag(id));

  const activity = await readPublicDetail(
    `/api/public/activities/${encodeURIComponent(id)}`,
    apiActivitySchema,
  );
  if (activity) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return activity;
};

/**
 * 전시 목록을 폴백 여부와 함께 캐시한다.
 *
 * `getFeaturedPublicExhibition`은 자기 `cacheLife`를 명시하므로 안쪽 캐시의 짧은 수명이
 * 바깥으로 전파되지 않는다. 바깥도 목록이 폴백이었는지 알아야 실패를 `hours`로 굳히지
 * 않을 수 있어서 결과째 공유한다.
 */
const readPublicExhibitions = async (): Promise<PublicReadResult<ApiExhibition[]>> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  const result = await readPublicWithFallback({
    path: "/api/public/exhibitions",
    schema: z.array(apiExhibitionSchema),
    fallback: [],
    event: "public.exhibitions.read_fallback",
  });
  if (result.ok) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result;
};

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> =>
  (await readPublicExhibitions()).data;

/** 전시 하나의 상세. 활동 상세와 같은 이유로 엔티티 태그만 붙인다. */
export const getPublicExhibitionById = async (
  id: string,
): Promise<ApiExhibition | null> => {
  "use cache";

  cacheTag(publicExhibitionTag(id));

  const exhibition = await readPublicDetail(
    `/api/public/exhibitions/${encodeURIComponent(id)}`,
    apiExhibitionSchema,
  );
  if (exhibition) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return exhibition;
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

  cacheTag(PUBLIC_CACHE_TAGS.exhibitions);

  const exhibitions = await readPublicExhibitions();
  if (exhibitions.ok) {
    cacheLife(SETTINGS_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return pickFeaturedPublicExhibition(exhibitions.data);
};

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.linktree);

  const result = await readPublicWithFallback({
    path: "/api/public/linktree",
    schema: z.array(apiLinktreeSchema),
    fallback: [],
    event: "public.linktree.read_fallback",
  });
  if (result.ok) {
    cacheLife(SETTINGS_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
};

export const getPublicSiteSettings = async (): Promise<ApiSiteSettings> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.siteSettings);

  const result = await readPublicWithFallback({
    path: "/api/public/site-settings",
    schema: apiSiteSettingsSchema,
    fallback: DEFAULT_SITE_SETTINGS,
    event: "public.site-settings.read_fallback",
  });
  if (result.ok) {
    cacheLife(SETTINGS_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
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

  cacheTag(PUBLIC_CACHE_TAGS.attachments);

  const query = new URLSearchParams({ scope });
  if (resourceId) {
    query.set("resourceId", resourceId);
  }

  const result = await readPublicWithFallback({
    path: `/api/public/attachments?${query.toString()}`,
    schema: z.array(apiAttachmentSchema),
    fallback: [],
    event: "public.attachments.read_fallback",
  });
  if (result.ok) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
};

export const getPublicCurrentRecruitingPlan =
  async (): Promise<ApiRecruitingPlan | null> => {
    "use cache";

    cacheTag(PUBLIC_CACHE_TAGS.recruitingPlan);

    const result = await readPublicWithFallback({
      path: "/api/public/recruiting-plan/current",
      schema: apiRecruitingPlanSchema.nullable(),
      fallback: null,
      event: "public.recruiting-plan.read_fallback",
    });
    if (result.ok) {
      cacheLife(SETTINGS_CACHE_PROFILE);
    } else {
      cacheLife(FAILURE_CACHE_PROFILE);
    }
    return result.data;
  };

export const listPublicGenerations = async (): Promise<ApiGeneration[]> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.generations);

  const result = await readPublicWithFallback({
    path: "/api/public/generations",
    schema: z.array(apiGenerationSchema),
    fallback: [],
    event: "public.generations.read_fallback",
  });
  if (result.ok) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
};

export const listPublicPhotographers = async (): Promise<
  ApiPublicGenerationWithMembers[]
> => {
  "use cache";

  cacheTag(PUBLIC_CACHE_TAGS.photographers);

  const result = await readPublicWithFallback({
    path: "/api/public/photographers",
    schema: z.array(apiPublicGenerationWithMembersSchema),
    fallback: [],
    event: "public.photographers.read_fallback",
  });
  if (result.ok) {
    cacheLife(ARCHIVE_CACHE_PROFILE);
  } else {
    cacheLife(FAILURE_CACHE_PROFILE);
  }
  return result.data;
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
