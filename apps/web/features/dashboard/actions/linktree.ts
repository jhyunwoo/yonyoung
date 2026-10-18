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
} from "@yonyoung/contracts/schemas";
import type {
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiLinktree,
  ApiLinktreeItem,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
} from "@yonyoung/contracts";

const LINKTREE_CACHE_TAGS = [
  CACHE_TAGS.admin.linktree,
  CACHE_TAGS.public.linktree,
] as const;

export const createLinktreeAction = async (
  input: ApiCreateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  return writeRequest({
    path: "/linktree",
    method: "POST",
    bodySchema: apiCreateLinktreeInputSchema,
    body: input,
    responseSchema: apiLinktreeSchema,
    accessScope: "manager",
    tags: LINKTREE_CACHE_TAGS,
  });
};

export const updateLinktreeAction = async (
  id: string,
  input: ApiUpdateLinktreeInput,
): Promise<AdminWriteActionResult<ApiLinktree>> => {
  return writeRequest({
    path: `/linktree/${id}`,
    method: "PATCH",
    bodySchema: apiUpdateLinktreeInputSchema,
    body: input,
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
  return writeRequest({
    path: `/linktree/${id}/items`,
    method: "POST",
    bodySchema: apiCreateLinktreeItemInputSchema,
    body: input,
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
  return writeRequest({
    path: `/linktree/${id}/items/${itemId}`,
    method: "PATCH",
    bodySchema: apiUpdateLinktreeItemInputSchema,
    body: input,
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
