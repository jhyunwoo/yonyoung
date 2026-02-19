import type {
  ApiActivity,
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
