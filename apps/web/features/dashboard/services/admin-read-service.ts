import "server-only";
import { z, type ZodType } from "zod";
import {
  apiMcpConnectionSchema,
  apiMcpOverviewSchema,
  type ApiMcpConnection,
  type ApiMcpOverview,
} from "@yonyoung/contracts/mcp";
import {
  HonoApiError,
  INVALID_RESPONSE_CODE,
  honoRequest,
} from "@/server/http/hono-client";
import { readCorrelationHeaders } from "@/server/http/request-context";
import { readCookieHeader } from "@/server/http/cookie-header";
import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiExhibition,
  ApiGenerationMemberSummary,
  ApiGeneration,
  ApiLinktree,
  ApiPageViewStats,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUser,
  ApiVisitorInsights,
} from "@yonyoung/contracts";
import {
  apiActivitySchema,
  apiAdminDashboardStatsSchema,
  apiExhibitionSchema,
  apiGenerationMemberSummarySchema,
  apiGenerationSchema,
  apiLinktreeSchema,
  apiPageViewStatsSchema,
  apiRecruitingPlanSchema,
  apiSiteSettingsSchema,
  apiUserSchema,
  apiVisitorInsightsSchema,
} from "@yonyoung/contracts/schemas";

const ADMIN_API_BASE_PATH = "/api";

/** API가 응답하지 않을 때 대시보드 렌더가 무한히 매달리지 않도록 하는 상한 */
const ADMIN_READ_TIMEOUT_MS = 15_000;

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

const readErrorReason = (error: HonoApiError): AdminReadErrorReason => {
  if (error.code === INVALID_RESPONSE_CODE) {
    return "invalid_response";
  }
  if (error.status === 401) {
    return "unauthorized";
  }
  if (error.status === 403) {
    return "forbidden";
  }
  if (error.status === 404) {
    return "not_found";
  }
  return "request_failed";
};

const toAdminReadError = (error: HonoApiError): AdminReadError => {
  // 응답을 받지 못한 실패(타임아웃·연결 실패)는 HTTP 상태가 없다.
  if (error.code === "TIMEOUT") {
    return {
      reason: "request_failed",
      message: "API 응답이 너무 늦어 데이터를 불러오지 못했습니다.",
      status: null,
    };
  }
  if (error.code === "API_UNAVAILABLE") {
    return {
      reason: "request_failed",
      message: error.cause instanceof Error ? error.cause.message : error.message,
      status: null,
    };
  }
  if (error.code === INVALID_RESPONSE_CODE) {
    return {
      reason: "invalid_response",
      message: "API 응답 형식이 올바르지 않습니다.",
      status: error.status,
    };
  }

  return {
    reason: readErrorReason(error),
    message: error.message,
    status: error.status,
  };
};

/**
 * 관리자 API 한 건을 읽고 계약 스키마로 검증한다.
 *
 * 실패를 빈 배열이나 null로 바꾸지 않는다. 호출부가 "데이터가 없음"과 "읽지 못함"을
 * 구분할 수 있어야 화면에서 빈 상태와 오류 상태를 다르게 보여 줄 수 있다.
 */
const readAdminResource = async <T>(
  path: string,
  schema: ZodType<T>,
): Promise<AdminReadResult<T>> => {
  const cookieHeader = await readCookieHeader();
  const { requestId, traceId } = await readCorrelationHeaders();

  try {
    const data = await honoRequest<T>({
      path: `${ADMIN_API_BASE_PATH}${path}`,
      method: "GET",
      cache: "no-store",
      responseSchema: schema,
      timeoutMs: ADMIN_READ_TIMEOUT_MS,
      requestId,
      traceId,
      cookieHeader,
    });

    return { ok: true, data };
  } catch (error) {
    if (error instanceof HonoApiError) {
      return { ok: false, error: toAdminReadError(error) };
    }

    throw error;
  }
};

export const listAdminActivities = (
  generationId: string,
): Promise<AdminReadResult<ApiActivity[]>> => {
  const query = new URLSearchParams({ generationId });
  return readAdminResource(`/activities?${query.toString()}`, apiActivitySchema.array());
};

export const listAdminExhibitions = (
  generationId: string,
): Promise<AdminReadResult<ApiExhibition[]>> => {
  const query = new URLSearchParams({ generationId });
  return readAdminResource(
    `/exhibitions?${query.toString()}`,
    apiExhibitionSchema.array(),
  );
};

export const listAdminLinktrees = (): Promise<AdminReadResult<ApiLinktree[]>> =>
  readAdminResource("/linktree", apiLinktreeSchema.array());

export const listAdminGenerationMembers = (
  generationId: string,
): Promise<AdminReadResult<ApiGenerationMemberSummary[]>> =>
  readAdminResource(
    `/generations/${encodeURIComponent(generationId)}/members`,
    apiGenerationMemberSummarySchema.array(),
  );

export const getAdminActivityById = (
  activityId: string,
): Promise<AdminReadResult<ApiActivity>> =>
  readAdminResource(`/activities/${encodeURIComponent(activityId)}`, apiActivitySchema);

export const getAdminExhibitionById = (
  exhibitionId: string,
): Promise<AdminReadResult<ApiExhibition>> =>
  readAdminResource(
    `/exhibitions/${encodeURIComponent(exhibitionId)}`,
    apiExhibitionSchema,
  );

export const getAdminLinktreeById = (
  linktreeId: string,
): Promise<AdminReadResult<ApiLinktree>> =>
  readAdminResource(`/linktree/${encodeURIComponent(linktreeId)}`, apiLinktreeSchema);

/**
 * 편집 화면용 사이트 설정. 실패를 기본값으로 바꾸지 않는다 — 기본값이 채워진 폼을
 * 저장하면 실제 연락처·후원 계좌가 예시 값으로 덮어써진다.
 */
export const getAdminSiteSettings = (): Promise<AdminReadResult<ApiSiteSettings>> =>
  readAdminResource("/site-settings", apiSiteSettingsSchema);

/** 현재 모집 계획. 아직 없으면 `data: null`이다(실패와 구분된다). */
export const getAdminCurrentRecruitingPlan = (): Promise<
  AdminReadResult<ApiRecruitingPlan | null>
> => readAdminResource("/recruiting-plan/current", apiRecruitingPlanSchema.nullable());

export const listAdminUsers = (): Promise<AdminReadResult<ApiUser[]>> =>
  readAdminResource("/users", apiUserSchema.array());

export const getAdminUserById = (userId: string): Promise<AdminReadResult<ApiUser>> =>
  readAdminResource(`/users/${encodeURIComponent(userId)}`, apiUserSchema);

export const listAdminGenerations = (): Promise<AdminReadResult<ApiGeneration[]>> =>
  readAdminResource("/generations", apiGenerationSchema.array());

export const getAdminDashboardStats = (
  generationSortOrder: number | null = null,
): Promise<AdminReadResult<ApiAdminDashboardStats>> => {
  const search = new URLSearchParams();
  if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
    search.set("generationSortOrder", String(generationSortOrder));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return readAdminResource(`/admin/dashboard${suffix}`, apiAdminDashboardStatsSchema);
};

export const getAdminPageViewStats = (): Promise<AdminReadResult<ApiPageViewStats>> =>
  readAdminResource("/admin/page-views/dashboard", apiPageViewStatsSchema);

/** apiSearch는 stats-range의 toInsightsApiSearch 결과다. */
export const getAdminVisitorInsights = (
  apiSearch: string,
): Promise<AdminReadResult<ApiVisitorInsights>> =>
  readAdminResource(`/admin/page-views/insights?${apiSearch}`, apiVisitorInsightsSchema);

export const getMcpOverview = (): Promise<AdminReadResult<ApiMcpOverview>> =>
  readAdminResource("/mcp/tools", apiMcpOverviewSchema);

export const getMcpConnections = (): Promise<AdminReadResult<ApiMcpConnection[]>> =>
  readAdminResource("/mcp/connections", z.array(apiMcpConnectionSchema));
