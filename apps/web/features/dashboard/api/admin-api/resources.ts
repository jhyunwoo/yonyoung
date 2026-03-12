import type {
  ApiActivity,
  ApiAdminDashboardStats,
  ApiAuditLog,
  ApiAuditResourceType,
  ApiExhibition,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiGenerationNotice,
  ApiGlobalNotice,
  ApiLinktree,
  ApiListActivitiesQuery,
  ApiListExhibitionsQuery,
  ApiListMarketItemsQuery,
  ApiMarketComment,
  ApiMarketItem,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUser,
  ApiUserResourceHistory,
} from "@/shared/contracts/api-contracts";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  addActivityImageAction,
  addActivityImagesAction,
  createActivityAction,
  deleteActivityAction,
  deleteActivityImageAction,
  updateActivityAction,
  updateActivityImageAction,
  updateActivityImagesAction,
} from "@/features/dashboard/actions/activities";
import {
  addExhibitionImageAction,
  addExhibitionImagesAction,
  createExhibitionAction,
  deleteExhibitionAction,
  deleteExhibitionImageAction,
  updateExhibitionAction,
  updateExhibitionImageAction,
  updateExhibitionImagesAction,
} from "@/features/dashboard/actions/exhibitions";
import {
  createGenerationAction,
  deleteGenerationAction,
  updateGenerationAction,
} from "@/features/dashboard/actions/generations";
import {
  addLinktreeItemAction,
  createLinktreeAction,
  deleteLinktreeAction,
  deleteLinktreeItemAction,
  updateLinktreeAction,
  updateLinktreeItemAction,
} from "@/features/dashboard/actions/linktree";
import {
  createMarketCommentAction,
  createMarketItemAction,
  deleteMarketCommentAction,
  deleteMarketItemAction,
  deleteMarketPushSubscriptionAction,
  updateMarketCommentAction,
  updateMarketItemAction,
  updateMarketItemStatusAction,
  upsertMarketPushSubscriptionAction,
} from "@/features/dashboard/actions/market";
import {
  createGenerationNoticeAction,
  createGlobalNoticeAction,
  deleteGenerationNoticeAction,
  deleteGlobalNoticeAction,
  updateGenerationNoticeAction,
  updateGlobalNoticeAction,
} from "@/features/dashboard/actions/notices";
import { upsertCurrentRecruitingPlanAction } from "@/features/dashboard/actions/recruiting";
import { updateSiteSettingsAction } from "@/features/dashboard/actions/site-settings";
import {
  bulkUpdateUsersRoleAction,
  deleteUserAction,
  updateUserAction,
} from "@/features/dashboard/actions/users";

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
};

export const adminResourceApi = {
  listAuditLogs: (resourceType: ApiAuditResourceType, resourceId: string, limit = 20) => {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const encodedResourceId = encodeURIComponent(resourceId);
    return apiRequest.get<ApiAuditLog[]>(
      `/audit/${resourceType}/${encodedResourceId}?limit=${safeLimit}`,
    );
  },

  listGenerations: () => apiRequest.get<ApiGeneration[]>("/generations"),
  createGeneration: createGenerationAction,
  getGenerationById: (id: string) => apiRequest.get<ApiGeneration>(`/generations/${id}`),
  listGenerationMembers: (generationId: string) =>
    apiRequest.get<ApiGenerationMemberSummary[]>(`/generations/${generationId}/members`),
  updateGeneration: updateGenerationAction,
  deleteGeneration: deleteGenerationAction,

  listActivities: (input: ApiListActivitiesQuery = {}) =>
    apiRequest.get<ApiActivity[]>(
      withOptionalQuery("/activities", { generationId: input.generationId }),
    ),
  createActivity: createActivityAction,
  getActivityById: (id: string) => apiRequest.get<ApiActivity>(`/activities/${id}`),
  updateActivity: updateActivityAction,
  deleteActivity: deleteActivityAction,
  addActivityImage: addActivityImageAction,
  addActivityImages: addActivityImagesAction,
  updateActivityImage: updateActivityImageAction,
  updateActivityImages: updateActivityImagesAction,
  deleteActivityImage: deleteActivityImageAction,

  listExhibitions: (input: ApiListExhibitionsQuery = {}) =>
    apiRequest.get<ApiExhibition[]>(
      withOptionalQuery("/exhibitions", { generationId: input.generationId }),
    ),
  createExhibition: createExhibitionAction,
  getExhibitionById: (id: string) => apiRequest.get<ApiExhibition>(`/exhibitions/${id}`),
  updateExhibition: updateExhibitionAction,
  deleteExhibition: deleteExhibitionAction,
  addExhibitionImage: addExhibitionImageAction,
  addExhibitionImages: addExhibitionImagesAction,
  updateExhibitionImage: updateExhibitionImageAction,
  updateExhibitionImages: updateExhibitionImagesAction,
  deleteExhibitionImage: deleteExhibitionImageAction,

  listLinktrees: () => apiRequest.get<ApiLinktree[]>("/linktree"),
  createLinktree: createLinktreeAction,
  getLinktreeById: (id: string) => apiRequest.get<ApiLinktree>(`/linktree/${id}`),
  updateLinktree: updateLinktreeAction,
  deleteLinktree: deleteLinktreeAction,
  addLinktreeItem: addLinktreeItemAction,
  updateLinktreeItem: updateLinktreeItemAction,
  deleteLinktreeItem: deleteLinktreeItemAction,

  listGenerationNotices: (generationId: string) =>
    apiRequest.get<ApiGenerationNotice[]>(`/generations/${generationId}/notices`),
  createGenerationNotice: createGenerationNoticeAction,
  getGenerationNoticeById: (generationId: string, noticeId: string) =>
    apiRequest.get<ApiGenerationNotice>(
      `/generations/${generationId}/notices/${noticeId}`,
    ),
  updateGenerationNotice: updateGenerationNoticeAction,
  deleteGenerationNotice: deleteGenerationNoticeAction,

  listGlobalNotices: () => apiRequest.get<ApiGlobalNotice[]>("/global-notices"),
  createGlobalNotice: createGlobalNoticeAction,
  getGlobalNoticeById: (id: string) =>
    apiRequest.get<ApiGlobalNotice>(`/global-notices/${id}`),
  updateGlobalNotice: updateGlobalNoticeAction,
  deleteGlobalNotice: deleteGlobalNoticeAction,

  listMarketItems: (input: ApiListMarketItemsQuery = {}) =>
    apiRequest.get<ApiMarketItem[]>(
      withOptionalQuery("/market/items", {
        status: input.status,
        sellerId: input.sellerId,
        page: typeof input.page === "number" ? String(input.page) : undefined,
        pageSize: typeof input.pageSize === "number" ? String(input.pageSize) : undefined,
      }),
    ),
  createMarketItem: createMarketItemAction,
  getMarketItemById: (id: string) => apiRequest.get<ApiMarketItem>(`/market/items/${id}`),
  updateMarketItem: updateMarketItemAction,
  updateMarketItemStatus: updateMarketItemStatusAction,
  deleteMarketItem: deleteMarketItemAction,
  listMarketCommentsByItemId: (id: string) =>
    apiRequest.get<ApiMarketComment[]>(`/market/items/${id}/comments`),
  createMarketComment: createMarketCommentAction,
  updateMarketComment: updateMarketCommentAction,
  deleteMarketComment: deleteMarketCommentAction,
  upsertMarketPushSubscription: upsertMarketPushSubscriptionAction,
  deleteMarketPushSubscription: deleteMarketPushSubscriptionAction,

  getSiteSettings: () => apiRequest.get<ApiSiteSettings>("/site-settings"),
  updateSiteSettings: updateSiteSettingsAction,

  getCurrentRecruitingPlan: () =>
    apiRequest.get<ApiRecruitingPlan | null>("/recruiting-plan/current"),
  upsertCurrentRecruitingPlan: upsertCurrentRecruitingPlanAction,

  listUsers: () => apiRequest.get<ApiUser[]>("/users"),
  getUserById: (id: string) => apiRequest.get<ApiUser>(`/users/${id}`),
  getUserResourceHistory: (
    id: string,
    input: {
      page?: number;
      pageSize?: number;
      action?: "create" | "update" | "delete";
    } = {},
  ) => {
    const safePage =
      typeof input.page === "number" && Number.isFinite(input.page) && input.page > 0
        ? Math.floor(input.page)
        : 1;
    const safePageSize =
      typeof input.pageSize === "number" &&
      Number.isFinite(input.pageSize) &&
      input.pageSize > 0
        ? Math.min(100, Math.floor(input.pageSize))
        : 10;
    return apiRequest.get<ApiUserResourceHistory>(
      withOptionalQuery(`/users/${id}/resource-history`, {
        page: String(safePage),
        pageSize: String(safePageSize),
        action: input.action,
      }),
    );
  },
  updateUser: updateUserAction,
  bulkUpdateUsersRole: bulkUpdateUsersRoleAction,

  getAdminDashboardStats: (generationSortOrder: number | null = null) => {
    const search = new URLSearchParams();
    if (typeof generationSortOrder === "number" && Number.isFinite(generationSortOrder)) {
      search.set("generationSortOrder", String(generationSortOrder));
    }

    const suffix = search.size > 0 ? `?${search.toString()}` : "";
    return apiRequest.get<ApiAdminDashboardStats>(`/admin/dashboard${suffix}`);
  },

  deleteUser: deleteUserAction,
} as const;

type AdminResourceApi = typeof adminResourceApi;

export type AdminResourceApiMethodName = keyof AdminResourceApi;

export type AdminResourceApiMethodResult<T extends AdminResourceApiMethodName> = Awaited<
  ReturnType<AdminResourceApi[T]>
>;
