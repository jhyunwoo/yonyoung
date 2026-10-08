import { z } from "zod";
import {
  ApiAttachmentListQuerySchema,
  ApiCreateAttachmentSchema,
  ApiUpdateAttachmentSchema,
} from "../../attachments/attachment.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { toolFailure } from "../tool-result";

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
  defineTool({
    name: "attachment_create",
    inputSchema: z.object({
      data: z.object({
        scope: attachmentFields.scope,
        resourceId: attachmentFields.resourceId,
        title: attachmentFields.title,
        sortOrder: attachmentFields.sortOrder,
        linkUrl: attachmentFields.linkUrl,
      }),
      file: chatGptFileSchema.optional(),
      upload_id: uploadIdSchema.optional(),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        if (args.file && args.upload_id) {
          return toolFailure("자료 파일은 하나만 넣을 수 있습니다.");
        }
        if ((args.file || args.upload_id) && args.data.linkUrl) {
          return toolFailure("파일과 linkUrl 중 하나만 넣어 주세요.");
        }
        const files = await context.files.resolve({
          purpose: args.data.scope === "site_donate" ? "site_file" : "activity_file",
          chatGptFiles: args.file ? [args.file] : [],
          uploadIds: args.upload_id ? [args.upload_id] : [],
        });
        const file = files[0];
        const body = file
          ? {
              ...args.data,
              fileUrl: file.publicUrl,
              fileName: file.fileName,
              fileSize: file.size,
              mimeType: file.contentType,
            }
          : args.data;
        return runWithFiles(
          context,
          files,
          { method: "POST", path: "/api/attachments", body },
          "첨부 자료를 등록했습니다.",
        );
      }),
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
