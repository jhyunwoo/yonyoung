import {
  MCP_UPLOAD_MAX_BYTES,
  MCP_UPLOAD_PURPOSES,
} from "@yonyoung/contracts/mcp";
import { z } from "zod";
import { uploadErrorResult } from "../files/mcp-upload-service";
import { defineTool } from "../tool-definition";
import { toolSuccess } from "../tool-result";

export const uploadTools = [
  defineTool({
    name: "upload_prepare",
    inputSchema: z.object({
      purpose: z
        .enum(MCP_UPLOAD_PURPOSES)
        .describe(
          "파일을 쓸 곳. 파일을 받는 도구 설명에 적힌 purpose를 씁니다.",
        ),
      file_name: z.string().min(1).max(255).describe("원래 파일 이름"),
      content_type: z
        .string()
        .min(1)
        .describe("MIME 형식. 예: image/jpeg, application/pdf"),
      size: z
        .number()
        .int()
        .positive()
        .max(MCP_UPLOAD_MAX_BYTES)
        .describe("파일 크기(bytes)"),
    }),
    handler: async (args, context) => {
      try {
        const prepared = await context.uploads.prepare(context.actor, {
          purpose: args.purpose,
          fileName: args.file_name,
          contentType: args.content_type,
          size: args.size,
        });
        const curl = `curl -sS -T "<파일 경로>" "${prepared.putUrl}"`;
        return toolSuccess(
          [
            "업로드를 준비했습니다. 10분 안에 한 번만 쓸 수 있습니다.",
            `1. 코드 실행 환경에서 실행하세요: ${curl}`,
            `2. 실행할 수 없거나 실패하면 사용자에게 이 주소를 열어 같은 파일을 올리도록 안내하세요: ${prepared.browserUrl}`,
            "3. upload_status로 completed를 확인한 뒤 upload_id를 파일 도구에 넘기세요.",
          ].join("\n"),
          {
            upload_id: prepared.uploadId,
            put_url: prepared.putUrl,
            browser_url: prepared.browserUrl,
            expires_at: prepared.expiresAt,
            curl,
          },
        );
      } catch (error) {
        return uploadErrorResult(error, context.actor.role);
      }
    },
  }),
  defineTool({
    name: "upload_status",
    inputSchema: z.object({
      upload_id: z.string().min(1).describe("upload_prepare가 준 upload_id"),
    }),
    handler: async (args, context) => {
      try {
        const record = await context.uploads.status(
          context.actor,
          args.upload_id,
        );
        return toolSuccess(`업로드 상태: ${record.status}`, {
          upload_id: record.id,
          status: record.status,
          file_name: record.fileName,
          size: record.declaredSize,
          expires_at: new Date(record.expiresAt).toISOString(),
        });
      } catch (error) {
        return uploadErrorResult(error, context.actor.role);
      }
    },
  }),
];
