"use server";

import { forbidden } from "next/navigation";
import { z } from "zod";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { canManageGlobalUsers } from "@/features/auth/model/auth-shared";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import {
  apiActivityImageSchema,
  apiActivitySchema,
  apiBulkUpdateUserRoleInputSchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiCreateGenerationInputSchema,
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiGenerationSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiMemberProfileUpdateInputSchema,
  apiRecruitingPlanSchema,
  apiSiteSettingsSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
  apiUpdateExhibitionImageBatchItemInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
  apiUpdateGenerationInputSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
  apiUpdateSiteSettingsInputSchema,
  apiUpdateUserInputSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
  apiUserSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiBulkUpdateUserRoleInput,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiCreateGenerationInput,
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiMemberProfileUpdateInput,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
  ApiUpdateGenerationInput,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
  ApiUpdateSiteSettingsInput,
  ApiUpdateUserInput,
  ApiUpsertCurrentRecruitingPlanInput,
  ApiUser,
} from "@/shared/contracts/api-contracts";

// 공통 쓰기 코어(writeRequest 등)는 admin-write-core.ts로 분리됨.
// 기존 import 경로 호환을 위해 결과 타입을 재수출한다.
export type {
  AdminWriteActionFailure,
  AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";

export type BulkUpdateUsersRoleActionResult = AdminWriteActionResult<ApiUser[]>;

export const createGenerationAction = async (
  input: ApiCreateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  const payload = apiCreateGenerationInputSchema.parse(input);
  return writeRequest({
    path: "/generations",
    method: "POST",
    body: payload,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const updateGenerationAction = async (
  id: string,
  input: ApiUpdateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  const payload = apiUpdateGenerationInputSchema.parse(input);
  return writeRequest({
    path: `/generations/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const deleteGenerationAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/generations/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "leadership",
    tags: [
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.admin.users,
      CACHE_TAGS.public.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const createActivityAction = async (
  input: ApiCreateActivityInput,
): Promise<AdminWriteActionResult<ApiActivity>> => {
  const payload = apiCreateActivityInputSchema.parse(input);
  return writeRequest({
    path: "/activities",
    method: "POST",
    body: payload,
    responseSchema: apiActivitySchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityAction = async (
  id: string,
  input: ApiUpdateActivityInput,
): Promise<AdminWriteActionResult<ApiActivity>> => {
  const payload = apiUpdateActivityInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiActivitySchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const deleteActivityAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/activities/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const addActivityImageAction = async (
  id: string,
  input: ApiCreateActivityImageInput,
): Promise<AdminWriteActionResult<ApiActivityImage>> => {
  const payload = apiCreateActivityImageInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}/images`,
    method: "POST",
    body: payload,
    responseSchema: apiActivityImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const addActivityImagesAction = async (
  id: string,
  inputs: ApiCreateActivityImageInput[],
): Promise<AdminWriteActionResult<ApiActivityImage[]>> => {
  const payload = z.array(apiCreateActivityImageInputSchema).parse(inputs);
  return writeRequest({
    path: `/activities/${id}/images/batch`,
    method: "POST",
    body: payload,
    responseSchema: z.array(apiActivityImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityImageAction = async (
  id: string,
  imageId: string,
  input: ApiUpdateActivityImageInput,
): Promise<AdminWriteActionResult<ApiActivityImage>> => {
  const payload = apiUpdateActivityImageInputSchema.parse(input);
  return writeRequest({
    path: `/activities/${id}/images/${imageId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiActivityImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const updateActivityImagesAction = async (
  id: string,
  inputs: ApiUpdateActivityImageBatchItemInput[],
): Promise<AdminWriteActionResult<ApiActivityImage[]>> => {
  const payload = z.array(apiUpdateActivityImageBatchItemInputSchema).parse(inputs);
  return writeRequest({
    path: `/activities/${id}/images/batch`,
    method: "PATCH",
    body: payload,
    responseSchema: z.array(apiActivityImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const deleteActivityImageAction = async (
  id: string,
  imageId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/activities/${id}/images/${imageId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.activities, CACHE_TAGS.public.activities],
  });
};

export const createExhibitionAction = async (
  input: ApiCreateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  const payload = apiCreateExhibitionInputSchema.parse(input);
  return writeRequest({
    path: "/exhibitions",
    method: "POST",
    body: payload,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionAction = async (
  id: string,
  input: ApiUpdateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  const payload = apiUpdateExhibitionInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const deleteExhibitionAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/exhibitions/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const addExhibitionImageAction = async (
  id: string,
  input: ApiCreateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  const payload = apiCreateExhibitionImageInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}/images`,
    method: "POST",
    body: payload,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const addExhibitionImagesAction = async (
  id: string,
  inputs: ApiCreateExhibitionImageInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  const payload = z.array(apiCreateExhibitionImageInputSchema).parse(inputs);
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "POST",
    body: payload,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionImageAction = async (
  id: string,
  imageId: string,
  input: ApiUpdateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  const payload = apiUpdateExhibitionImageInputSchema.parse(input);
  return writeRequest({
    path: `/exhibitions/${id}/images/${imageId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const updateExhibitionImagesAction = async (
  id: string,
  inputs: ApiUpdateExhibitionImageBatchItemInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  const payload = z.array(apiUpdateExhibitionImageBatchItemInputSchema).parse(inputs);
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "PATCH",
    body: payload,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const deleteExhibitionImageAction = async (
  id: string,
  imageId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images/${imageId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.exhibitions, CACHE_TAGS.public.exhibitions],
  });
};

export const createLinktreeAction = async (
  input: ApiCreateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  const payload = apiCreateLinktreeInputSchema.parse(input);
  return writeRequest({
    path: "/linktree",
    method: "POST",
    body: payload,
    responseSchema: apiLinktreeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const updateLinktreeAction = async (
  id: string,
  input: ApiUpdateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  const payload = apiUpdateLinktreeInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiLinktreeSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const deleteLinktreeAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/linktree/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const addLinktreeItemAction = async (
  id: string,
  input: ApiCreateLinktreeItemInput,
): Promise<AdminWriteActionResult<ApiLinktreeItem>> => {
  const payload = apiCreateLinktreeItemInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}/items`,
    method: "POST",
    body: payload,
    responseSchema: apiLinktreeItemSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const updateLinktreeItemAction = async (
  id: string,
  itemId: string,
  input: ApiUpdateLinktreeItemInput,
): Promise<AdminWriteActionResult<ApiLinktreeItem>> => {
  const payload = apiUpdateLinktreeItemInputSchema.parse(input);
  return writeRequest({
    path: `/linktree/${id}/items/${itemId}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiLinktreeItemSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const deleteLinktreeItemAction = async (
  id: string,
  itemId: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/linktree/${id}/items/${itemId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "manager",
    tags: [CACHE_TAGS.admin.linktree, CACHE_TAGS.public.linktree],
  });
};

export const updateSiteSettingsAction = async (
  input: ApiUpdateSiteSettingsInput,
): Promise<AdminWriteActionResult<ApiSiteSettings>> => {
  const parsedPayload = apiUpdateSiteSettingsInputSchema.safeParse(input);
  if (!parsedPayload.success) {
    const firstIssue = parsedPayload.error.issues[0];
    const firstPath = firstIssue?.path[0];
    const issueMessage =
      firstPath === "footerEmail"
        ? "이메일 형식이 올바르지 않습니다."
        : firstPath === "donateAccountNumber"
          ? "계좌번호는 숫자와 -만 입력할 수 있으며 최대 50자입니다."
          : "기본 설정 입력값 형식을 확인해 주세요.";

    return {
      ok: false,
      errorMessage: issueMessage,
      status: 400,
      code: "VALIDATION_ERROR",
      requestId: null,
    };
  }

  const payload = parsedPayload.data;
  return writeRequest({
    path: "/site-settings",
    method: "PATCH",
    body: payload,
    responseSchema: apiSiteSettingsSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.siteSettings, CACHE_TAGS.public.siteSettings],
  });
};

export const upsertCurrentRecruitingPlanAction = async (
  input: ApiUpsertCurrentRecruitingPlanInput,
): Promise<AdminWriteActionResult<ApiRecruitingPlan>> => {
  const payload = apiUpsertCurrentRecruitingPlanInputSchema.parse(input);
  return writeRequest({
    path: "/recruiting-plan/current",
    method: "PATCH",
    body: payload,
    responseSchema: apiRecruitingPlanSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.recruitingPlan, CACHE_TAGS.public.recruitingPlan],
  });
};

export const updateUserAction = async (
  id: string,
  input: ApiUpdateUserInput,
): Promise<AdminWriteActionResult<ApiUser>> => {
  const session = await serverAuthGuard.requireSession();
  const canManageUsers = canManageGlobalUsers(session);
  let payload: ApiUpdateUserInput | ApiMemberProfileUpdateInput;

  if (canManageUsers) {
    payload = apiUpdateUserInputSchema.parse(input);
  } else {
    const profile = await serverAuthGuard.getCurrentUserProfile(session);
    const currentProfileId =
      profile && typeof profile.id === "string" ? profile.id.trim() : "";
    const allowedUserIds = new Set(
      [session.user.id, currentProfileId].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    );

    if (!allowedUserIds.has(id)) {
      forbidden();
    }

    payload = apiMemberProfileUpdateInputSchema.parse(input);
  }

  return writeRequest({
    path: `/users/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema,
    requireAdminAccess: canManageUsers,
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const bulkUpdateUsersRoleAction = async (
  input: ApiBulkUpdateUserRoleInput,
): Promise<BulkUpdateUsersRoleActionResult> => {
  const payload = apiBulkUpdateUserRoleInputSchema.parse(input);
  return writeRequest({
    path: "/users/bulk-role",
    method: "PATCH",
    body: payload,
    responseSchema: apiUserSchema.array(),
    accessScope: "user_manager",
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};

export const deleteUserAction = async (
  id: string,
): Promise<AdminWriteActionResult<void>> => {
  return writeRequest({
    path: `/users/${id}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: "user_manager",
    tags: [
      CACHE_TAGS.admin.users,
      CACHE_TAGS.admin.generations,
      CACHE_TAGS.public.photographers,
    ],
  });
};
