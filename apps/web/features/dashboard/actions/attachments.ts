"use server";

import { z } from "zod";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  readNoContentSchema,
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import {
  apiAttachmentSchema,
  apiCreateAttachmentInputSchema,
  apiUpdateAttachmentInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiAttachment,
  ApiAttachmentScope,
  ApiCreateAttachmentInput,
  ApiUpdateAttachmentInput,
} from "@/shared/contracts/api-contracts";

/**
 * 첨부파일(회계 자료, 월간연영회 PDF 등) 관리자 서버 액션.
 *
 * scope별 접근 범위:
 * - "activity": manager 이상 (활동 관리 권한과 동일)
 * - "site_donate": 회장/부회장 (사이트 설정 권한과 동일)
 * 최종 권한 판정은 API의 RBAC이 수행하며, 여기서는 UX 레벨 검증만 합니다.
 */

const ATTACHMENT_CACHE_TAGS = [
  CACHE_TAGS.admin.attachments,
  CACHE_TAGS.public.attachments,
] as const;

const accessScopeByAttachmentScope = (scope: ApiAttachmentScope) =>
  scope === "site_donate" ? ("leadership" as const) : ("manager" as const);

export const createAttachmentAction = async (
  input: ApiCreateAttachmentInput,
): Promise<AdminWriteActionResult<ApiAttachment>> => {
  const payload = apiCreateAttachmentInputSchema.parse(input);
  return writeRequest({
    path: "/attachments",
    method: "POST",
    body: payload,
    responseSchema: apiAttachmentSchema,
    accessScope: accessScopeByAttachmentScope(payload.scope),
    tags: ATTACHMENT_CACHE_TAGS,
  });
};

export const updateAttachmentAction = async (
  id: string,
  scope: ApiAttachmentScope,
  input: ApiUpdateAttachmentInput,
): Promise<AdminWriteActionResult<ApiAttachment>> => {
  const payload = apiUpdateAttachmentInputSchema.parse(input);
  return writeRequest({
    path: `/attachments/${id}`,
    method: "PATCH",
    body: payload,
    responseSchema: apiAttachmentSchema,
    accessScope: accessScopeByAttachmentScope(scope),
    tags: ATTACHMENT_CACHE_TAGS,
  });
};

export const deleteAttachmentAction = async (
  id: string,
  scope: ApiAttachmentScope,
): Promise<AdminWriteActionResult<undefined>> => {
  const parsedId = z.string().min(1).parse(id);
  return writeRequest({
    path: `/attachments/${parsedId}`,
    method: "DELETE",
    responseSchema: readNoContentSchema,
    accessScope: accessScopeByAttachmentScope(scope),
    tags: ATTACHMENT_CACHE_TAGS,
  });
};
