"use server";

import { z } from "zod";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiActivityImageSchema,
  apiActivitySchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
} from "@/shared/contracts/api-contracts";

const ACTIVITY_CACHE_TAGS = [
  CACHE_TAGS.admin.activities,
  CACHE_TAGS.public.activities,
] as const;

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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
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
    tags: ACTIVITY_CACHE_TAGS,
  });
};
