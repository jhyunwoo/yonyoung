import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiSupporter,
  ApiUser,
  DataEnvelope,
} from "./admin-api/types";
import { ADMIN_CACHE_TAGS, type AdminCacheTag } from "./admin-cache";
import { resolveAuthApiUrl } from "./auth-server";

const ADMIN_API_BASE_PATH = "/api";

type DataEnvelopeCandidate<T> = DataEnvelope<T> & {
  data?: unknown;
};

const parseArrayPayload = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as DataEnvelopeCandidate<unknown>).data)
  ) {
    return ((payload as DataEnvelopeCandidate<unknown[]>).data ?? []) as T[];
  }

  return [];
};

const fetchAdminCollection = async <T>(
  path: string,
  cookieHeader: string | null,
  tag: AdminCacheTag,
): Promise<T[]> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    const response = await fetch(`${resolveAuthApiUrl()}${ADMIN_API_BASE_PATH}${path}`, {
      method: "GET",
      headers,
      next: {
        tags: [tag],
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return parseArrayPayload<T>(payload);
  } catch {
    return [];
  }
};

export const fetchAdminActivitiesFromServer = async (
  cookieHeader: string | null,
): Promise<ApiActivity[]> =>
  fetchAdminCollection<ApiActivity>("/activities", cookieHeader, ADMIN_CACHE_TAGS.activities);

export const fetchAdminExhibitionsFromServer = async (
  cookieHeader: string | null,
): Promise<ApiExhibition[]> =>
  fetchAdminCollection<ApiExhibition>("/exhibitions", cookieHeader, ADMIN_CACHE_TAGS.exhibitions);

export const fetchAdminSupportersFromServer = async (
  cookieHeader: string | null,
): Promise<ApiSupporter[]> =>
  fetchAdminCollection<ApiSupporter>("/supporters", cookieHeader, ADMIN_CACHE_TAGS.supporters);

export const fetchAdminLinktreesFromServer = async (
  cookieHeader: string | null,
): Promise<ApiLinktree[]> =>
  fetchAdminCollection<ApiLinktree>("/linktree", cookieHeader, ADMIN_CACHE_TAGS.linktree);

export const fetchAdminUsersFromServer = async (
  cookieHeader: string | null,
): Promise<ApiUser[]> =>
  fetchAdminCollection<ApiUser>("/users", cookieHeader, ADMIN_CACHE_TAGS.users);

export const fetchAdminGenerationsFromServer = async (
  cookieHeader: string | null,
): Promise<ApiGeneration[]> =>
  fetchAdminCollection<ApiGeneration>("/generations", cookieHeader, ADMIN_CACHE_TAGS.generations);

export const fetchAdminDashboardStatsFromServer = async (
  cookieHeader: string | null,
  generationSortOrder: number | null,
): Promise<ApiAdminDashboardStats | null> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const search = new URLSearchParams();
  if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
    search.set("generationSortOrder", String(generationSortOrder));
  }
  const suffix = search.size > 0 ? `?${search.toString()}` : "";

  try {
    const response = await fetch(
      `${resolveAuthApiUrl()}${ADMIN_API_BASE_PATH}/admin/dashboard${suffix}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    if (
      typeof payload === "object" &&
      payload !== null &&
      "data" in payload &&
      typeof (payload as DataEnvelopeCandidate<unknown>).data === "object" &&
      (payload as DataEnvelopeCandidate<unknown>).data !== null
    ) {
      return (payload as DataEnvelopeCandidate<ApiAdminDashboardStats>).data ?? null;
    }

    if (typeof payload === "object" && payload !== null) {
      return payload as ApiAdminDashboardStats;
    }

    return null;
  } catch {
    return null;
  }
};
