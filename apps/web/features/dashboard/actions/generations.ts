"use server";

import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiCreateGenerationInputSchema,
  apiGenerationSchema,
  apiReorderGenerationsInputSchema,
  apiUpdateGenerationInputSchema,
} from "@yonyoung/contracts/schemas";
import type {
  ApiCreateGenerationInput,
  ApiGeneration,
  ApiReorderGenerationsInput,
  ApiUpdateGenerationInput,
} from "@yonyoung/contracts";

const GENERATION_CACHE_TAGS = [
  CACHE_TAGS.admin.generations,
  CACHE_TAGS.admin.users,
  CACHE_TAGS.public.generations,
  CACHE_TAGS.public.photographers,
] as const;

export const createGenerationAction = async (
  input: ApiCreateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  return writeRequest({
    path: "/generations",
    method: "POST",
    bodySchema: apiCreateGenerationInputSchema,
    body: input,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: GENERATION_CACHE_TAGS,
  });
};

export const updateGenerationAction = async (
  id: string,
  input: ApiUpdateGenerationInput,
): Promise<AdminWriteActionResult<ApiGeneration>> => {
  return writeRequest({
    path: `/generations/${id}`,
    method: "PATCH",
    bodySchema: apiUpdateGenerationInputSchema,
    body: input,
    responseSchema: apiGenerationSchema,
    accessScope: "leadership",
    tags: GENERATION_CACHE_TAGS,
  });
};

/** 기수 정렬 순서를 한 트랜잭션으로 바꾼다. 응답은 변경 후 전체 기수 목록이다. */
export const reorderGenerationsAction = async (
  input: ApiReorderGenerationsInput,
): Promise<AdminWriteActionResult<ApiGeneration[]>> => {
  return writeRequest({
    path: "/generations/reorder",
    method: "POST",
    bodySchema: apiReorderGenerationsInputSchema,
    body: input,
    responseSchema: apiGenerationSchema.array(),
    accessScope: "leadership",
    tags: GENERATION_CACHE_TAGS,
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
    tags: GENERATION_CACHE_TAGS,
  });
};
