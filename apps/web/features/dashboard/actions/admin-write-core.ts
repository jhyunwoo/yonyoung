import "server-only";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { z } from "zod";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  assertAdminWriteAccess,
  type AdminWriteAccessScope,
} from "@/features/dashboard/actions/admin-write-access";
import { readCookieHeader } from "@/shared/http/http";
import type { AdminCacheTag, PublicCacheTag } from "@/server/cache/tags";
import { HonoApiError, honoRequest } from "@/server/http/hono-client";

/**
 * 관리자 쓰기 서버 액션 공통 코어.
 *
 * "use server" 파일은 모든 값 export가 클라이언트에서 호출 가능한 서버 액션이 되므로,
 * writeRequest 같은 내부 헬퍼는 이 파일(서버 전용, 액션 아님)에 두고
 * 각 도메인 액션 파일이 import해서 사용합니다.
 */

const ADMIN_API_BASE_PATH = "/api";

export type CacheTag = AdminCacheTag | PublicCacheTag;

export type AdminWriteActionFailure = {
  ok: false;
  errorMessage: string;
  status: number;
  code: string;
  requestId: string | null;
};

export type AdminWriteActionResult<T> =
  | {
      ok: true;
      data: T;
    }
  | AdminWriteActionFailure;

/** 쓰기 성공 후 관련 캐시 태그를 일괄 무효화합니다. */
export const tagsToUpdate = (tags: readonly CacheTag[]): void => {
  for (const tag of tags) {
    updateTag(tag);
  }
};

/** 요청 추적용 상관관계 헤더(x-request-id/x-trace-id)를 읽거나 새로 만듭니다. */
export const readCorrelationHeaders = async (): Promise<{
  requestId: string;
  traceId: string;
}> => {
  const requestHeaders = await headers();
  const requestId = requestHeaders.get("x-request-id")?.trim() || crypto.randomUUID();
  const traceId = requestHeaders.get("x-trace-id")?.trim() || crypto.randomUUID();

  return {
    requestId,
    traceId,
  };
};

/** 세션 확인 + 요청 범위(scope)에 맞는 관리자 쓰기 권한을 검증합니다 (UX 레벨, 최종 권한은 API가 판정). */
export const requireAdminAccess = async (
  scope: AdminWriteAccessScope = "verified_member",
) => {
  const session = await serverAuthGuard.requireSession();
  assertAdminWriteAccess(session, scope);
};

export const readNoContentSchema = z
  .unknown()
  .optional()
  .nullable()
  .transform(() => undefined);

export const toAdminWriteActionFailure = (
  error: HonoApiError,
): AdminWriteActionFailure => ({
  ok: false,
  errorMessage: error.message,
  status: error.status,
  code: error.code,
  requestId: error.requestId,
});

/**
 * 관리자 API 쓰기 요청 공통 처리.
 * 흐름: 권한 확인 → 쿠키/추적 헤더 수집 → API 호출 → 성공 시 캐시 태그 무효화.
 */
export const writeRequest = async <TResponse>(input: {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  responseSchema: z.ZodType<TResponse>;
  tags: readonly CacheTag[];
  timeoutMs?: number;
  requireAdminAccess?: boolean;
  accessScope?: AdminWriteAccessScope;
}): Promise<AdminWriteActionResult<TResponse>> => {
  if (input.requireAdminAccess !== false) {
    await requireAdminAccess(input.accessScope);
  }

  const cookieHeader = await readCookieHeader();
  const { requestId, traceId } = await readCorrelationHeaders();

  try {
    const result = await honoRequest<TResponse>({
      path: `${ADMIN_API_BASE_PATH}${input.path}`,
      method: input.method,
      body: input.body,
      cache: "no-store",
      responseSchema: input.responseSchema,
      timeoutMs: input.timeoutMs ?? 45_000,
      requestId,
      traceId,
      cookieHeader,
    });

    tagsToUpdate(input.tags);

    return {
      ok: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof HonoApiError) {
      return toAdminWriteActionFailure(error);
    }

    throw error;
  }
};
