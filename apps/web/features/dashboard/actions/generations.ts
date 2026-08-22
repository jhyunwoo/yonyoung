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
  apiUpdateGenerationInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiCreateGenerationInput,
  ApiGeneration,
  ApiUpdateGenerationInput,
} from "@/shared/contracts/api-contracts";

const GENERATION_CACHE_TAGS = [
  CACHE_TAGS.admin.generations,
  CACHE_TAGS.admin.users,
  CACHE_TAGS.public.generations,
  CACHE_TAGS.public.photographers,
] as const;

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
    tags: GENERATION_CACHE_TAGS,
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
