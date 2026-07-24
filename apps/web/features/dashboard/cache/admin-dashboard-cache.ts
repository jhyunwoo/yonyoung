import { resolveApiBaseUrl } from "@/shared/http/http";
import { applyForwardedRequestContextHeaders } from "@/shared/http/http";
import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiExhibition,
  ApiGenerationMemberSummary,
  ApiLinktree,
  ApiPageViewStats,
} from "@/shared/contracts/api-contracts";
import { unwrapDataEnvelope } from "@/shared/http/http";
import { readServerForwardedRequestContext } from "@/server/http/request-context";

const ADMIN_API_BASE_PATH = "/api";

const readAdminCollection = async <T>(
  path: string,
  cookieHeader: string | null,
): Promise<T[]> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[readAdminCollection Error] PATH: ${path}, STATUS: ${response.status}, RESPONSE: ${errorText}`);
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const rows = unwrapDataEnvelope<T[]>(payload);

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error(`[readAdminCollection Exception] PATH: ${path}, ERROR:`, error);
    return [];
  }
};

type AdminDataResult<T> = {
  data: T | null;
  error: string | null;
};

const readAdminData = async <T>(
  path: string,
  cookieHeader: string | null,
): Promise<AdminDataResult<T>> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
    applyForwardedRequestContextHeaders(
      headers,
      await readServerForwardedRequestContext(),
    );
  }

  try {
    const response = await fetch(`${resolveApiBaseUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      const errorMessage =
        payload?.error?.message || `API Error (Status: ${response.status})`;
      console.error(`[readAdminData Error] PATH: ${path}, STATUS: ${response.status}, MESSAGE: ${errorMessage}`);
      return { data: null, error: errorMessage };
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const data = unwrapDataEnvelope<T>(payload);
    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[readAdminData Exception] PATH: ${path}, ERROR:`, error);
    return { data: null, error: errorMessage };
  }
};

export const listCachedActivities = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiActivity[]> => {
  const query = new URLSearchParams({ generationId });
  return readAdminCollection<ApiActivity>(
    `/activities?${query.toString()}`,
    cookieHeader,
  );
};

export const listCachedExhibitions = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiExhibition[]> => {
  const query = new URLSearchParams({ generationId });
  return readAdminCollection<ApiExhibition>(
    `/exhibitions?${query.toString()}`,
    cookieHeader,
  );
};

export const listCachedLinktrees = async (
  cookieHeader: string | null,
): Promise<ApiLinktree[]> => {
  return readAdminCollection<ApiLinktree>("/linktree", cookieHeader);
};

export const listCachedGenerationMembers = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiGenerationMemberSummary[]> => {
  return readAdminCollection<ApiGenerationMemberSummary>(
    `/generations/${encodeURIComponent(generationId)}/members`,
    cookieHeader,
  );
};

export const getCachedAdminDashboardStats = async (
  cookieHeader: string | null,
  generationSortOrder: number | null = null,
): Promise<ApiAdminDashboardStats | null> => {
  const search = new URLSearchParams();
  if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
    search.set("generationSortOrder", String(generationSortOrder));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  const result = await readAdminData<ApiAdminDashboardStats>(`/admin/dashboard${suffix}`, cookieHeader);
  return result.data;
};

export type PageViewStatsResult = {
  data: ApiPageViewStats | null;
  error: string | null;
};

export const getCachedPageViewStats = async (
  cookieHeader: string | null,
): Promise<PageViewStatsResult> => {
  return readAdminData<ApiPageViewStats>("/admin/page-views/dashboard", cookieHeader);
};
