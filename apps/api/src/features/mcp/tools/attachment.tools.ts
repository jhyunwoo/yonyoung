import { ApiAttachmentListQuerySchema } from "../../attachments/attachment.contract";
import { routeTool } from "../tool-definition";

export const attachmentTools = [
  routeTool({
    name: "attachment_list",
    method: "GET",
    path: "/api/attachments",
    inputSchema: ApiAttachmentListQuerySchema,
    summary: "첨부 자료 목록입니다.",
  }),
];
