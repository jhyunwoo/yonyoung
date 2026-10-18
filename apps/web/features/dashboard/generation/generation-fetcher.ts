import { z } from "zod";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/server/cache/tags";
import { toFreshPublicReadPath } from "@/server/http/fresh-public-read";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";
import { logger } from "@/server/observability/logger";
import { apiGenerationSchema } from "@yonyoung/contracts/schemas";
import type { ApiGeneration } from "@yonyoung/contracts";

const PUBLIC_GENERATIONS_PATH = "/api/public/generations";

const GENERATIONS_READ_TIMEOUT_MS = 10_000;

/**
 * 성공한 목록의 캐시 수명. 공개 기수 목록(`listPublicGenerations`)과 같은 `days`다.
 * 기수·사용자 쓰기가 `admin:generations` 태그를 `updateTag`로 버리므로 만료에 기대지 않는다.
 */
const GENERATIONS_CACHE_PROFILE = "days";

/**
 * 실패(빈 목록)의 캐시 수명. 짧아야 일시적인 API 장애가 빈 기수 목록으로 굳지 않는다.
 * `seconds`는 프리렌더에서 동적 입력으로 취급되므로 `minutes`다(`og-cover-image.ts`와 같은 이유).
 */
const GENERATIONS_FAILURE_CACHE_PROFILE = "minutes";

export const fetchGenerationsFromServer = async (): Promise<ApiGeneration[]> => {
  "use cache";

  cacheTag(CACHE_TAGS.admin.generations);

  try {
    const generations = await honoRequest({
      path: toFreshPublicReadPath(PUBLIC_GENERATIONS_PATH),
      method: "GET",
      responseSchema: z.array(apiGenerationSchema),
      timeoutMs: GENERATIONS_READ_TIMEOUT_MS,
    });

    cacheLife(GENERATIONS_CACHE_PROFILE);
    return generations;
  } catch (error) {
    logger.warn({
      event: "dashboard.generations.read_fallback",
      route: PUBLIC_GENERATIONS_PATH,
      method: "GET",
      status: error instanceof HonoApiError ? error.status : 500,
      error: {
        code: error instanceof HonoApiError ? error.code : undefined,
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    cacheLife(GENERATIONS_FAILURE_CACHE_PROFILE);
    return [];
  }
};
