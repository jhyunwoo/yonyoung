"use server";

import { z } from "zod";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS, publicActivityTag } from "@/server/cache/tags";
import {
  apiActivityImageSchema,
  apiActivitySchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
} from "@yonyoung/contracts/schemas";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
} from "@yonyoung/contracts";

/** 목록에 영향을 주는 태그. 항목이 추가·수정·삭제되면 언제나 함께 버린다. */
const ACTIVITY_COLLECTION_TAGS = [
  CACHE_TAGS.admin.activities,
  CACHE_TAGS.public.activities,
] as const;

/**
 * 활동 하나를 건드리는 쓰기의 무효화 집합 = 목록 + 그 활동의 상세.
 *
 * 다른 활동의 상세(`public:activity:<other>`)는 건드리지 않는다. 예전에는 상세도
 * `public:activities` 하나로 묶여 있어서, 활동 하나만 고쳐도 사전 렌더된 상세
 * 페이지 전부가 무효화되고 다음 방문마다 Worker 왕복이 되살아났다.
 */
const activityTags = (id: string) =>
  [...ACTIVITY_COLLECTION_TAGS, publicActivityTag(id)] as const;

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
    tags: ACTIVITY_COLLECTION_TAGS,
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
    tags: activityTags(id),
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
    tags: activityTags(id),
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
    tags: activityTags(id),
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
    tags: activityTags(id),
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
    tags: activityTags(id),
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
    tags: activityTags(id),
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
    tags: activityTags(id),
  });
};
