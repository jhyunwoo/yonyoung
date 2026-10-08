import type { CallToolResult } from "@modelcontextprotocol/server";
import type { InternalApiRequest } from "../internal-api";
import type { McpToolContext } from "../tool-definition";
import { toToolResult } from "../tool-result";
import { uploadErrorResult, type ResolvedUpload } from "./mcp-upload-service";

/** 업로드를 소비 상태로 잡고 라우트를 부른다. 라우트가 실패하면 업로드를 되돌린다. */
export const runWithFiles = async (
  context: McpToolContext,
  files: ResolvedUpload[],
  request: InternalApiRequest,
  summary: string,
): Promise<CallToolResult> => {
  await context.files.claim(files);
  const result = await context.api.call(request);
  if (!result.ok) {
    await context.files.release(files);
  }
  return toToolResult(result, { summary, role: context.actor.role });
};

export const withUploadErrors = async (
  context: McpToolContext,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> => {
  try {
    return await run();
  } catch (error) {
    return uploadErrorResult(error, context.actor.role);
  }
};

export const imageBatchItem = (file: ResolvedUpload, sortOrder: number) => ({
  imageUrl: file.publicUrl,
  sortOrder,
  ...(file.width && file.height ? { width: file.width, height: file.height } : {}),
});

/** 기존 세부 이미지 뒤에 붙일 첫 순서. */
export const nextSortOrder = (images: Array<{ sortOrder: number }>): number =>
  images.length === 0 ? 0 : Math.max(...images.map((image) => image.sortOrder)) + 1;
