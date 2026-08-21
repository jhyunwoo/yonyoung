"use server";

import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiLinktree,
  ApiLinktreeItem,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
} from "@/shared/contracts/api-contracts";

const LINKTREE_CACHE_TAGS = [
  CACHE_TAGS.admin.linktree,
  CACHE_TAGS.public.linktree,
] as const;

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
    tags: LINKTREE_CACHE_TAGS,
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
    tags: LINKTREE_CACHE_TAGS,
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
    tags: LINKTREE_CACHE_TAGS,
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
    tags: LINKTREE_CACHE_TAGS,
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
    tags: LINKTREE_CACHE_TAGS,
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
    tags: LINKTREE_CACHE_TAGS,
  });
};
