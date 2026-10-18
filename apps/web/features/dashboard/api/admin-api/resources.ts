import type {
  ApiActivity,
  ApiAttachment,
  ApiAttachmentScope,
  ApiAuditLog,
  ApiAuditResourceType,
  ApiExhibition,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiLinktree,
  ApiRecruitingPlan,
  ApiUser,
  ApiUserResourceHistory,
} from "@yonyoung/contracts";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import { bindAdminWriteAction } from "@/features/dashboard/api/admin-api/action-results";
import {
  createAttachmentAction,
  deleteAttachmentAction,
  updateAttachmentAction,
} from "@/features/dashboard/actions/attachments";
import {
  addActivityImagesAction,
  createActivityAction,
  deleteActivityAction,
  deleteActivityImageAction,
  updateActivityAction,
  updateActivityImagesAction,
} from "@/features/dashboard/actions/activities";
import {
  addExhibitionImagesAction,
  createExhibitionAction,
  deleteExhibitionAction,
  deleteExhibitionImageAction,
  updateExhibitionAction,
  updateExhibitionImagesAction,
} from "@/features/dashboard/actions/exhibitions";
import {
  createGenerationAction,
  deleteGenerationAction,
  reorderGenerationsAction,
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
import { upsertCurrentRecruitingPlanAction } from "@/features/dashboard/actions/recruiting";
import { updateSiteSettingsAction } from "@/features/dashboard/actions/site-settings";
import {
  bulkUpdateUsersRoleAction,
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
  createGeneration: bindAdminWriteAction(createGenerationAction),
  listGenerationMembers: (generationId: string) =>
    apiRequest.get<ApiGenerationMemberSummary[]>(
      `/generations/${encodeURIComponent(generationId)}/members`,
    ),
  updateGeneration: bindAdminWriteAction(updateGenerationAction),
  reorderGenerations: bindAdminWriteAction(reorderGenerationsAction),
  deleteGeneration: bindAdminWriteAction(deleteGenerationAction),

  createActivity: bindAdminWriteAction(createActivityAction),
  getActivityById: (id: string) =>
    apiRequest.get<ApiActivity>(`/activities/${encodeURIComponent(id)}`),
  updateActivity: bindAdminWriteAction(updateActivityAction),
  deleteActivity: bindAdminWriteAction(deleteActivityAction),
  addActivityImages: bindAdminWriteAction(addActivityImagesAction),
  updateActivityImages: bindAdminWriteAction(updateActivityImagesAction),
  deleteActivityImage: bindAdminWriteAction(deleteActivityImageAction),

  createExhibition: bindAdminWriteAction(createExhibitionAction),
  getExhibitionById: (id: string) =>
    apiRequest.get<ApiExhibition>(`/exhibitions/${encodeURIComponent(id)}`),
  updateExhibition: bindAdminWriteAction(updateExhibitionAction),
  deleteExhibition: bindAdminWriteAction(deleteExhibitionAction),
  addExhibitionImages: bindAdminWriteAction(addExhibitionImagesAction),
  updateExhibitionImages: bindAdminWriteAction(updateExhibitionImagesAction),
  deleteExhibitionImage: bindAdminWriteAction(deleteExhibitionImageAction),

  listAttachments: (scope: ApiAttachmentScope, resourceId?: string) =>
    apiRequest.get<ApiAttachment[]>(
      withOptionalQuery("/attachments", { scope, resourceId }),
    ),
  createAttachment: bindAdminWriteAction(createAttachmentAction),
  updateAttachment: bindAdminWriteAction(updateAttachmentAction),
  deleteAttachment: bindAdminWriteAction(deleteAttachmentAction),

  createLinktree: bindAdminWriteAction(createLinktreeAction),
  getLinktreeById: (id: string) =>
    apiRequest.get<ApiLinktree>(`/linktree/${encodeURIComponent(id)}`),
  updateLinktree: bindAdminWriteAction(updateLinktreeAction),
  deleteLinktree: bindAdminWriteAction(deleteLinktreeAction),
  addLinktreeItem: bindAdminWriteAction(addLinktreeItemAction),
  updateLinktreeItem: bindAdminWriteAction(updateLinktreeItemAction),
  deleteLinktreeItem: bindAdminWriteAction(deleteLinktreeItemAction),

  updateSiteSettings: bindAdminWriteAction(updateSiteSettingsAction),

  getCurrentRecruitingPlan: () =>
    apiRequest.get<ApiRecruitingPlan | null>("/recruiting-plan/current"),
  upsertCurrentRecruitingPlan: bindAdminWriteAction(upsertCurrentRecruitingPlanAction),

  getUserById: (id: string) =>
    apiRequest.get<ApiUser>(`/users/${encodeURIComponent(id)}`),
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
      withOptionalQuery(`/users/${encodeURIComponent(id)}/resource-history`, {
        page: String(safePage),
        pageSize: String(safePageSize),
        action: input.action,
      }),
    );
  },
  updateUser: bindAdminWriteAction(updateUserAction),
  bulkUpdateUsersRole: bindAdminWriteAction(bulkUpdateUsersRoleAction),
} as const;
