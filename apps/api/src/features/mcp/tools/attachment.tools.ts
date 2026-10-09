import { z } from "zod";
import {
  ApiAttachmentListQuerySchema,
  ApiCreateAttachmentSchema,
  ApiUpdateAttachmentSchema,
} from "../../attachments/attachment.contract";
import { routeTool, uuidArg } from "../tool-definition";

const attachmentId = uuidArg("첨부 자료 ID. attachment_list로 찾습니다.");

const attachmentFields = ApiCreateAttachmentSchema.shape;
export const attachmentTools = [
  routeTool({
    name: "attachment_list",
    method: "GET",
    path: "/api/attachments",
    inputSchema: ApiAttachmentListQuerySchema,
    summary: "첨부 자료 목록입니다.",
  }),
  routeTool({
    name: "attachment_create",
    method: "POST",
    path: "/api/attachments",
    inputSchema: z.object({
      data: z.object({
        scope: attachmentFields.scope,
        resourceId: attachmentFields.resourceId,
        title: attachmentFields.title,
        sortOrder: attachmentFields.sortOrder,
        linkUrl: attachmentFields.linkUrl
          .unwrap()
          .describe("외부 링크 URL. 예: 구글 독스 공유 링크"),
      }),
    }),
    summary: "첨부 자료를 등록했습니다.",
  }),
  routeTool({
    name: "attachment_update",
    method: "PATCH",
    path: "/api/attachments/{id}",
    inputSchema: z.object({
      id: attachmentId,
      data: ApiUpdateAttachmentSchema,
    }),
    summary: "첨부 자료를 수정했습니다.",
  }),
  routeTool({
    name: "attachment_delete",
    method: "DELETE",
    path: "/api/attachments/{id}",
    inputSchema: z.object({ id: attachmentId }),
    summary: "첨부 자료를 삭제했습니다.",
  }),
];
