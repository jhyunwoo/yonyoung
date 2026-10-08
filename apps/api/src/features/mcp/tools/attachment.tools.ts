import { z } from "zod";
import {
  ApiAttachmentListQuerySchema,
  ApiUpdateAttachmentSchema,
} from "../../attachments/attachment.contract";
import { routeTool, uuidArg } from "../tool-definition";

const attachmentId = uuidArg("첨부 자료 ID. attachment_list로 찾습니다.");
export const attachmentTools = [
  routeTool({
    name: "attachment_list",
    method: "GET",
    path: "/api/attachments",
    inputSchema: ApiAttachmentListQuerySchema,
    summary: "첨부 자료 목록입니다.",
  }),
  routeTool({
    name: "attachment_update",
    method: "PATCH",
    path: "/api/attachments/{id}",
    inputSchema: z.object({ id: attachmentId, data: ApiUpdateAttachmentSchema }),
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
