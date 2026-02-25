import { adminRequest } from "./http";
import { ADMIN_CACHE_TAGS, type AdminCacheTag } from "../admin-cache";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiAdminDashboardStats,
  ApiAuditLog,
  ApiAuditResourceType,
  ApiBulkUpdateUserRoleInput,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiCreateGenerationInput,
  ApiCreateGenerationNoticeInput,
  ApiCreateGlobalNoticeInput,
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiCreateSupporterInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiLinktreeItem,
  ApiListActivitiesQuery,
  ApiListExhibitionsQuery,
  ApiSupporter,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
  ApiUpdateGenerationInput,
  ApiUpdateGenerationNoticeInput,
  ApiUpdateGlobalNoticeInput,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
  ApiUpdateSupporterInput,
  ApiUpdateUserInput,
  ApiUser,
} from "./types";

const ADMIN_REVALIDATE_ENDPOINT = "/api/admin/revalidate";

const revalidateAdminCache = async (
  tags: readonly AdminCacheTag[],
): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch(ADMIN_REVALIDATE_ENDPOINT, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // 재검증 실패는 변이 결과를 무효화하지 않는다.
  }
};

const withAdminCacheRevalidation = async <T>(
  operation: () => Promise<T>,
  tags: readonly AdminCacheTag[],
): Promise<T> => {
  const result = await operation();
  await revalidateAdminCache(tags);
  return result;
};

const withOptionalQuery = (
  path: string,
  query: Record<string, string | undefined>,
): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (!value) {
      continue;
    }
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString.length === 0 ? path : `${path}?${queryString}`;
};

const apiRequest = {
  get: <T>(path: string) => adminRequest<T>(path, "GET"),
  post: <T>(path: string, body: unknown) => adminRequest<T>(path, "POST", body),
  patch: <T>(path: string, body: unknown) => adminRequest<T>(path, "PATCH", body),
  delete: <T>(path: string) => adminRequest<T>(path, "DELETE"),
};

const mutateWithRevalidation = <T>(
  tags: readonly AdminCacheTag[],
  operation: () => Promise<T>,
): Promise<T> => withAdminCacheRevalidation(operation, tags);

const postWithRevalidation = <T>(
  path: string,
  body: unknown,
  tags: readonly AdminCacheTag[],
): Promise<T> =>
  mutateWithRevalidation(tags, () => apiRequest.post<T>(path, body));

const patchWithRevalidation = <T>(
  path: string,
  body: unknown,
  tags: readonly AdminCacheTag[],
): Promise<T> =>
  mutateWithRevalidation(tags, () => apiRequest.patch<T>(path, body));

const deleteWithRevalidation = (
  path: string,
  tags: readonly AdminCacheTag[],
): Promise<void> =>
  mutateWithRevalidation(tags, () => apiRequest.delete<void>(path));

export const adminResourceApi = {
  listAuditLogs: (
    resourceType: ApiAuditResourceType,
    resourceId: string,
    limit = 20,
  ) => {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const encodedResourceId = encodeURIComponent(resourceId);
    return apiRequest.get<ApiAuditLog[]>(
      `/audit/${resourceType}/${encodedResourceId}?limit=${safeLimit}`,
    );
  },

  listGenerations: () => apiRequest.get<ApiGeneration[]>("/generations"),
  createGeneration: (input: ApiCreateGenerationInput) =>
    postWithRevalidation<ApiGeneration>("/generations", input, [
      ADMIN_CACHE_TAGS.generations,
      ADMIN_CACHE_TAGS.users,
    ]),
  getGenerationById: (id: string) => apiRequest.get<ApiGeneration>(`/generations/${id}`),
  listGenerationMembers: (generationId: string) =>
    apiRequest.get<ApiGenerationMemberSummary[]>(`/generations/${generationId}/members`),
  updateGeneration: (id: string, input: ApiUpdateGenerationInput) =>
    patchWithRevalidation<ApiGeneration>(`/generations/${id}`, input, [
      ADMIN_CACHE_TAGS.generations,
      ADMIN_CACHE_TAGS.users,
    ]),
  deleteGeneration: (id: string) =>
    deleteWithRevalidation(`/generations/${id}`, [
      ADMIN_CACHE_TAGS.generations,
      ADMIN_CACHE_TAGS.users,
    ]),

  listActivities: (input: ApiListActivitiesQuery = {}) =>
    apiRequest.get<ApiActivity[]>(
      withOptionalQuery("/activities", { generationId: input.generationId }),
    ),
  createActivity: (input: ApiCreateActivityInput) =>
    postWithRevalidation<ApiActivity>("/activities", input, [ADMIN_CACHE_TAGS.activities]),
  getActivityById: (id: string) => apiRequest.get<ApiActivity>(`/activities/${id}`),
  updateActivity: (id: string, input: ApiUpdateActivityInput) =>
    patchWithRevalidation<ApiActivity>(`/activities/${id}`, input, [ADMIN_CACHE_TAGS.activities]),
  deleteActivity: (id: string) =>
    deleteWithRevalidation(`/activities/${id}`, [ADMIN_CACHE_TAGS.activities]),
  addActivityImage: (id: string, input: ApiCreateActivityImageInput) =>
    postWithRevalidation<ApiActivityImage>(`/activities/${id}/images`, input, [ADMIN_CACHE_TAGS.activities]),
  addActivityImages: (id: string, inputs: ApiCreateActivityImageInput[]) =>
    postWithRevalidation<ApiActivityImage[]>(`/activities/${id}/images/batch`, inputs, [
      ADMIN_CACHE_TAGS.activities,
    ]),
  updateActivityImage: (
    id: string,
    imageId: string,
    input: ApiUpdateActivityImageInput,
  ) =>
    patchWithRevalidation<ApiActivityImage>(`/activities/${id}/images/${imageId}`, input, [
      ADMIN_CACHE_TAGS.activities,
    ]),
  updateActivityImages: (
    id: string,
    inputs: ApiUpdateActivityImageBatchItemInput[],
  ) =>
    patchWithRevalidation<ApiActivityImage[]>(`/activities/${id}/images/batch`, inputs, [
      ADMIN_CACHE_TAGS.activities,
    ]),
  deleteActivityImage: (id: string, imageId: string) =>
    deleteWithRevalidation(`/activities/${id}/images/${imageId}`, [
      ADMIN_CACHE_TAGS.activities,
    ]),

  listSupporters: () => apiRequest.get<ApiSupporter[]>("/supporters"),
  createSupporter: (input: ApiCreateSupporterInput) =>
    postWithRevalidation<ApiSupporter>("/supporters", input, [ADMIN_CACHE_TAGS.supporters]),
  getSupporterById: (id: string) => apiRequest.get<ApiSupporter>(`/supporters/${id}`),
  updateSupporter: (id: string, input: ApiUpdateSupporterInput) =>
    patchWithRevalidation<ApiSupporter>(`/supporters/${id}`, input, [ADMIN_CACHE_TAGS.supporters]),
  deleteSupporter: (id: string) =>
    deleteWithRevalidation(`/supporters/${id}`, [ADMIN_CACHE_TAGS.supporters]),

  listExhibitions: (input: ApiListExhibitionsQuery = {}) =>
    apiRequest.get<ApiExhibition[]>(
      withOptionalQuery("/exhibitions", { generationId: input.generationId }),
    ),
  createExhibition: (input: ApiCreateExhibitionInput) =>
    postWithRevalidation<ApiExhibition>("/exhibitions", input, [ADMIN_CACHE_TAGS.exhibitions]),
  getExhibitionById: (id: string) =>
    apiRequest.get<ApiExhibition>(`/exhibitions/${id}`),
  updateExhibition: (id: string, input: ApiUpdateExhibitionInput) =>
    patchWithRevalidation<ApiExhibition>(`/exhibitions/${id}`, input, [ADMIN_CACHE_TAGS.exhibitions]),
  deleteExhibition: (id: string) =>
    deleteWithRevalidation(`/exhibitions/${id}`, [ADMIN_CACHE_TAGS.exhibitions]),
  addExhibitionImage: (id: string, input: ApiCreateExhibitionImageInput) =>
    postWithRevalidation<ApiExhibitionImage>(`/exhibitions/${id}/images`, input, [
      ADMIN_CACHE_TAGS.exhibitions,
    ]),
  addExhibitionImages: (id: string, inputs: ApiCreateExhibitionImageInput[]) =>
    postWithRevalidation<ApiExhibitionImage[]>(`/exhibitions/${id}/images/batch`, inputs, [
      ADMIN_CACHE_TAGS.exhibitions,
    ]),
  updateExhibitionImage: (
    id: string,
    imageId: string,
    input: ApiUpdateExhibitionImageInput,
  ) =>
    patchWithRevalidation<ApiExhibitionImage>(`/exhibitions/${id}/images/${imageId}`, input, [
      ADMIN_CACHE_TAGS.exhibitions,
    ]),
  updateExhibitionImages: (
    id: string,
    inputs: ApiUpdateExhibitionImageBatchItemInput[],
  ) =>
    patchWithRevalidation<ApiExhibitionImage[]>(`/exhibitions/${id}/images/batch`, inputs, [
      ADMIN_CACHE_TAGS.exhibitions,
    ]),
  deleteExhibitionImage: (id: string, imageId: string) =>
    deleteWithRevalidation(`/exhibitions/${id}/images/${imageId}`, [
      ADMIN_CACHE_TAGS.exhibitions,
    ]),

  listLinktrees: () => apiRequest.get<ApiLinktree[]>("/linktree"),
  createLinktree: (input: ApiCreateLinktreeInput) =>
    postWithRevalidation<ApiLinktree>("/linktree", input, [ADMIN_CACHE_TAGS.linktree]),
  getLinktreeById: (id: string) => apiRequest.get<ApiLinktree>(`/linktree/${id}`),
  updateLinktree: (id: string, input: ApiUpdateLinktreeInput) =>
    patchWithRevalidation<ApiLinktree>(`/linktree/${id}`, input, [ADMIN_CACHE_TAGS.linktree]),
  deleteLinktree: (id: string) =>
    deleteWithRevalidation(`/linktree/${id}`, [ADMIN_CACHE_TAGS.linktree]),
  addLinktreeItem: (id: string, input: ApiCreateLinktreeItemInput) =>
    postWithRevalidation<ApiLinktreeItem>(`/linktree/${id}/items`, input, [ADMIN_CACHE_TAGS.linktree]),
  updateLinktreeItem: (
    id: string,
    itemId: string,
    input: ApiUpdateLinktreeItemInput,
  ) =>
    patchWithRevalidation<ApiLinktreeItem>(`/linktree/${id}/items/${itemId}`, input, [
      ADMIN_CACHE_TAGS.linktree,
    ]),
  deleteLinktreeItem: (id: string, itemId: string) =>
    deleteWithRevalidation(`/linktree/${id}/items/${itemId}`, [ADMIN_CACHE_TAGS.linktree]),

  listGenerationNotices: (generationId: string) =>
    apiRequest.get<ApiGenerationNotice[]>(`/generations/${generationId}/notices`),
  createGenerationNotice: (
    generationId: string,
    input: ApiCreateGenerationNoticeInput,
  ) =>
    postWithRevalidation<ApiGenerationNotice>(`/generations/${generationId}/notices`, input, [
      ADMIN_CACHE_TAGS.notices,
    ]),
  getGenerationNoticeById: (generationId: string, noticeId: string) =>
    apiRequest.get<ApiGenerationNotice>(`/generations/${generationId}/notices/${noticeId}`),
  updateGenerationNotice: (
    generationId: string,
    noticeId: string,
    input: ApiUpdateGenerationNoticeInput,
  ) =>
    patchWithRevalidation<ApiGenerationNotice>(`/generations/${generationId}/notices/${noticeId}`, input, [
      ADMIN_CACHE_TAGS.notices,
    ]),
  deleteGenerationNotice: (generationId: string, noticeId: string) =>
    deleteWithRevalidation(`/generations/${generationId}/notices/${noticeId}`, [
      ADMIN_CACHE_TAGS.notices,
    ]),

  listGlobalNotices: () => apiRequest.get<ApiGlobalNotice[]>("/global-notices"),
  createGlobalNotice: (input: ApiCreateGlobalNoticeInput) =>
    postWithRevalidation<ApiGlobalNotice>("/global-notices", input, [ADMIN_CACHE_TAGS.notices]),
  getGlobalNoticeById: (id: string) =>
    apiRequest.get<ApiGlobalNotice>(`/global-notices/${id}`),
  updateGlobalNotice: (id: string, input: ApiUpdateGlobalNoticeInput) =>
    patchWithRevalidation<ApiGlobalNotice>(`/global-notices/${id}`, input, [ADMIN_CACHE_TAGS.notices]),
  deleteGlobalNotice: (id: string) =>
    deleteWithRevalidation(`/global-notices/${id}`, [ADMIN_CACHE_TAGS.notices]),

  listUsers: () => apiRequest.get<ApiUser[]>("/users"),
  getUserById: (id: string) => apiRequest.get<ApiUser>(`/users/${id}`),
  updateUser: (id: string, input: ApiUpdateUserInput) =>
    patchWithRevalidation<ApiUser>(`/users/${id}`, input, [
      ADMIN_CACHE_TAGS.users,
      ADMIN_CACHE_TAGS.generations,
    ]),
  bulkUpdateUsersRole: (input: ApiBulkUpdateUserRoleInput) =>
    patchWithRevalidation<ApiUser[]>("/users/bulk-role", input, [
      ADMIN_CACHE_TAGS.users,
      ADMIN_CACHE_TAGS.generations,
    ]),
  getAdminDashboardStats: (generationSortOrder: number | null = null) => {
    const search = new URLSearchParams();
    if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
      search.set("generationSortOrder", String(generationSortOrder));
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return apiRequest.get<ApiAdminDashboardStats>(`/admin/dashboard${suffix}`);
  },
  deleteUser: (id: string) =>
    deleteWithRevalidation(`/users/${id}`, [
      ADMIN_CACHE_TAGS.users,
      ADMIN_CACHE_TAGS.generations,
    ]),
} as const;
