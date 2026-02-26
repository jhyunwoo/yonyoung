import { resolveAuthApiUrl } from "./auth-server";
import type {
  ApiActivity,
  ApiExhibition,
  ApiGenerationMemberSummary,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiSupporter,
} from "./admin-api/types";

const ADMIN_API_BASE_PATH = "/api";

type DataEnvelope<T> = {
  data: T;
};

const unwrapDataEnvelope = <T>(payload: unknown): T | null => {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if ("data" in payload) {
    return (payload as DataEnvelope<T>).data ?? null;
  }

  return payload as T;
};

const readAdminCollection = async <T>(
  path: string,
  cookieHeader: string | null,
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
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    const rows = unwrapDataEnvelope<T[]>(payload);

    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
};

export const listCachedActivities = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiActivity[]> => {
  const query = new URLSearchParams({ generationId });
  return readAdminCollection<ApiActivity>(`/activities?${query.toString()}`, cookieHeader);
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

export const listCachedGenerationNotices = async (
  generationId: string,
  cookieHeader: string | null,
): Promise<ApiGenerationNotice[]> => {
  return readAdminCollection<ApiGenerationNotice>(
    `/generations/${encodeURIComponent(generationId)}/notices`,
    cookieHeader,
  );
};

export const listCachedGlobalNotices = async (
  cookieHeader: string | null,
): Promise<ApiGlobalNotice[]> => {
  return readAdminCollection<ApiGlobalNotice>("/global-notices", cookieHeader);
};

export const listCachedSupporters = async (
  cookieHeader: string | null,
): Promise<ApiSupporter[]> => {
  return readAdminCollection<ApiSupporter>("/supporters", cookieHeader);
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
