"use server";

import { z } from "zod";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS, publicExhibitionTag } from "@/server/cache/tags";
import {
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiUpdateExhibitionImageBatchItemInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
} from "@yonyoung/contracts/schemas";
import type {
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
} from "@yonyoung/contracts";
import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts";

/** 목록(과 홈 히어로의 노출 전시 선택)에 영향을 주는 태그. */
const EXHIBITION_COLLECTION_TAGS = [
  CACHE_TAGS.admin.exhibitions,
  CACHE_TAGS.public.exhibitions,
] as const;

/**
 * 전시 하나를 건드리는 쓰기의 무효화 집합 = 목록 + 그 전시의 상세.
 * 근거는 `activities.ts` 의 `activityTags` 와 같다.
 */
const exhibitionTags = (id: string) =>
  [...EXHIBITION_COLLECTION_TAGS, publicExhibitionTag(id)] as const;

export const createExhibitionAction = async (
  input: ApiCreateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  return writeRequest({
    path: "/exhibitions",
    method: "POST",
    bodySchema: apiCreateExhibitionInputSchema,
    body: input,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: EXHIBITION_COLLECTION_TAGS,
  });
};

export const updateExhibitionAction = async (
  id: string,
  input: ApiUpdateExhibitionInput,
): Promise<AdminWriteActionResult<ApiExhibition>> => {
  return writeRequest({
    path: `/exhibitions/${id}`,
    method: "PATCH",
    bodySchema: apiUpdateExhibitionInputSchema,
    body: input,
    responseSchema: apiExhibitionSchema,
    accessScope: "manager",
    tags: exhibitionTags(id),
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
    tags: exhibitionTags(id),
  });
};

export const addExhibitionImageAction = async (
  id: string,
  input: ApiCreateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images`,
    method: "POST",
    bodySchema: apiCreateExhibitionImageInputSchema,
    body: input,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: exhibitionTags(id),
  });
};

export const addExhibitionImagesAction = async (
  id: string,
  inputs: ApiCreateExhibitionImageInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "POST",
    bodySchema: z.array(apiCreateExhibitionImageInputSchema).max(IMAGE_BATCH_MAX_ITEMS),
    body: inputs,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: exhibitionTags(id),
  });
};

export const updateExhibitionImageAction = async (
  id: string,
  imageId: string,
  input: ApiUpdateExhibitionImageInput,
): Promise<AdminWriteActionResult<ApiExhibitionImage>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images/${imageId}`,
    method: "PATCH",
    bodySchema: apiUpdateExhibitionImageInputSchema,
    body: input,
    responseSchema: apiExhibitionImageSchema,
    accessScope: "manager",
    tags: exhibitionTags(id),
  });
};

export const updateExhibitionImagesAction = async (
  id: string,
  inputs: ApiUpdateExhibitionImageBatchItemInput[],
): Promise<AdminWriteActionResult<ApiExhibitionImage[]>> => {
  return writeRequest({
    path: `/exhibitions/${id}/images/batch`,
    method: "PATCH",
    bodySchema: z
      .array(apiUpdateExhibitionImageBatchItemInputSchema)
      .max(IMAGE_BATCH_MAX_ITEMS),
    body: inputs,
    responseSchema: z.array(apiExhibitionImageSchema),
    accessScope: "manager",
    tags: exhibitionTags(id),
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
    tags: exhibitionTags(id),
  });
};
