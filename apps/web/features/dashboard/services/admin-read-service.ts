import "server-only";
import type { ZodType } from "zod";
import {
  applyForwardedRequestContextHeaders,
  resolveApiBaseUrl,
  unwrapDataEnvelope,
} from "@/shared/http/http";
import { readServerForwardedRequestContext } from "@/server/http/request-context";
import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiExhibition,
  ApiGenerationMemberSummary,
  ApiGeneration,
  ApiLinktree,
  ApiPageViewStats,
  ApiUser,
} from "@/shared/contracts/api-contracts";
import {
  apiActivitySchema,
  apiAdminDashboardStatsSchema,
  apiExhibitionSchema,
  apiGenerationMemberSummarySchema,
  apiGenerationSchema,
  apiLinktreeSchema,
  apiPageViewStatsSchema,
  apiUserSchema,
} from "@/shared/contracts/api-schemas";

const ADMIN_API_BASE_PATH = "/api";

/**
 * 관리자 화면의 읽기는 항상 `cache: "no-store"`다. 권한별로 응답이 갈리는 데이터를
 * 캐시에 남기면 안 되기 때문이다. 이 모듈 이름에 "cache"가 들어가지 않는 이유이기도 하다.
 */
export type AdminReadResult<T> =
  { ok: true; data: T } | { ok: false; error: AdminReadError };

export type AdminReadErrorReason =
  "unauthorized" | "forbidden" | "not_found" | "invalid_response" | "request_failed";

export type AdminReadError = {
  reason: AdminReadErrorReason;
  message: string;
  status: number | null;
};

const readErrorReason = (status: number): AdminReadErrorReason => {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 403) {
    return "forbidden";
  }
  if (status === 404) {
    return "not_found";
  }
  return "request_failed";
};

const buildAdminHeaders = async (cookieHeader: string | null): Promise<Headers> => {
  const headers = new Headers({ Accept: "application/json" });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  return headers;
};

/**
 * 관리자 API 한 건을 읽고 계약 스키마로 검증한다.
 *
 * 실패를 빈 배열이나 null로 바꾸지 않는다. 호출부가 "데이터가 없음"과 "읽지 못함"을
 * 구분할 수 있어야 화면에서 빈 상태와 오류 상태를 다르게 보여 줄 수 있다.
 */
const readAdminResource = async <T>(
  path: string,
  cookieHeader: string | null,
  schema: ZodType<T>,
): Promise<AdminReadResult<T>> => {
  let response: Response;
  try {
    response = await fetch(`${resolveApiBaseUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers: await buildAdminHeaders(cookieHeader),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      error: {
        reason: "request_failed",
        message: error instanceof Error ? error.message : String(error),
        status: null,
      },
    };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;

    return {
      ok: false,
      error: {
        reason: readErrorReason(response.status),
        message: payload?.error?.message || `API Error (Status: ${response.status})`,
        status: response.status,
      },
    };
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(unwrapDataEnvelope<unknown>(payload));

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        reason: "invalid_response",
        message: parsed.error.issues[0]?.message ?? "API 응답 형식이 올바르지 않습니다.",
        status: response.status,
      },
    };
  }

  return { ok: true, data: parsed.data };
};

export const listAdminActivities = (
  generationId: string,
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiActivity[]>> => {
  const query = new URLSearchParams({ generationId });
  return readAdminResource(
    `/activities?${query.toString()}`,
    cookieHeader,
    apiActivitySchema.array(),
  );
};

export const listAdminExhibitions = (
  generationId: string,
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiExhibition[]>> => {
  const query = new URLSearchParams({ generationId });
  return readAdminResource(
    `/exhibitions?${query.toString()}`,
    cookieHeader,
    apiExhibitionSchema.array(),
  );
};

export const listAdminLinktrees = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiLinktree[]>> =>
  readAdminResource("/linktree", cookieHeader, apiLinktreeSchema.array());

export const listAdminGenerationMembers = (
  generationId: string,
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiGenerationMemberSummary[]>> =>
  readAdminResource(
    `/generations/${encodeURIComponent(generationId)}/members`,
    cookieHeader,
    apiGenerationMemberSummarySchema.array(),
  );

export const getAdminActivityById = (
  activityId: string,
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiActivity>> =>
  readAdminResource(
    `/activities/${encodeURIComponent(activityId)}`,
    cookieHeader,
    apiActivitySchema,
  );

export const getAdminExhibitionById = (
  exhibitionId: string,
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiExhibition>> =>
  readAdminResource(
    `/exhibitions/${encodeURIComponent(exhibitionId)}`,
    cookieHeader,
    apiExhibitionSchema,
  );

export const listAdminUsers = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiUser[]>> =>
  readAdminResource("/users", cookieHeader, apiUserSchema.array());

export const listAdminGenerations = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiGeneration[]>> =>
  readAdminResource("/generations", cookieHeader, apiGenerationSchema.array());

export const getAdminDashboardStats = (
  cookieHeader: string | null,
  generationSortOrder: number | null = null,
): Promise<AdminReadResult<ApiAdminDashboardStats>> => {
  const search = new URLSearchParams();
  if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
    search.set("generationSortOrder", String(generationSortOrder));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return readAdminResource(
    `/admin/dashboard${suffix}`,
    cookieHeader,
    apiAdminDashboardStatsSchema,
  );
};

export const getAdminPageViewStats = (
  cookieHeader: string | null,
): Promise<AdminReadResult<ApiPageViewStats>> =>
  readAdminResource("/admin/page-views/dashboard", cookieHeader, apiPageViewStatsSchema);
