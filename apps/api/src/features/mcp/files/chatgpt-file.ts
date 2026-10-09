import { MCP_UPLOAD_MAX_BYTES } from "@yonyoung/contracts/mcp";
import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";
import { z } from "zod";
import type { AppBindings } from "../../../types/honoAppType";
import { McpUploadError } from "./mcp-upload-service";

/** Apps SDK 규칙: 네 속성을 모두 선언하고 download_url, file_id만 required로 둔다. */
export const chatGptFileSchema = z
  .object({
    download_url: z.url().describe("ChatGPT가 채우는 임시 다운로드 URL"),
    file_id: z.string().describe("ChatGPT 파일 ID"),
    mime_type: z.string().optional(),
    file_name: z.string().optional(),
  })
  .describe("ChatGPT에서 채팅에 올린 파일. ChatGPT가 자동으로 채웁니다.");

export type ChatGptFileRef = z.infer<typeof chatGptFileSchema>;

export const uploadIdSchema = z
  .string()
  .min(1)
  .describe("Claude: upload_prepare로 준비하고 올린 업로드의 upload_id");

export const DEFAULT_CHATGPT_FILE_HOST_SUFFIXES = [".oaiusercontent.com"];

export const resolveChatGptFileHostSuffixes = (
  env: Partial<AppBindings> | undefined,
): string[] => {
  const raw = env?.MCP_CHATGPT_FILE_HOST_SUFFIXES?.trim();
  if (!raw) {
    return DEFAULT_CHATGPT_FILE_HOST_SUFFIXES;
  }
  return raw
    .split(",")
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean)
    .map((suffix) => (suffix.startsWith(".") ? suffix : `.${suffix}`));
};

export const isAllowedChatGptFileUrl = (
  value: string,
  hostSuffixes: readonly string[],
): boolean => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }
  const hostname = url.hostname.toLowerCase();
  return hostSuffixes.some(
    (suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length,
  );
};

const fileNameFromUrl = (value: string): string | null => {
  const last = new URL(value).pathname.split("/").filter(Boolean).pop();
  if (!last) {
    return null;
  }
  try {
    return decodeURIComponent(last);
  } catch {
    return null;
  }
};

/**
 * ChatGPT가 넘긴 download_url에서 파일을 받는다. 허용 호스트만 요청하고 리다이렉트는 따르지 않는다.
 * R2는 길이를 모르는 스트림을 받지 않으므로 Content-Length가 없으면 거부한다.
 */
export const downloadChatGptFile = async (
  file: ChatGptFileRef,
  deps: {
    fetch: (request: Request) => Promise<Response>;
    hostSuffixes: readonly string[];
  },
): Promise<{
  fileName: string;
  contentType: string;
  size: number;
  body: ReadableStream<Uint8Array>;
}> => {
  if (!isAllowedChatGptFileUrl(file.download_url, deps.hostSuffixes)) {
    throw new McpUploadError(400, "ChatGPT가 준 파일 주소가 아닙니다.");
  }

  const response = await deps.fetch(
    new Request(file.download_url, { redirect: "manual" }),
  );
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new McpUploadError(
      502,
      "ChatGPT 파일 주소가 다른 곳으로 이동했습니다. 파일을 다시 올려 주세요.",
    );
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new McpUploadError(
      502,
      `ChatGPT 파일을 내려받지 못했습니다(HTTP ${response.status}).`,
    );
  }

  const lengthHeader = response.headers.get("content-length");
  if (!lengthHeader || !/^\d+$/.test(lengthHeader)) {
    await response.body.cancel();
    throw new McpUploadError(
      411,
      "ChatGPT 파일 크기를 알 수 없어 받을 수 없습니다.",
    );
  }
  const size = Number(lengthHeader);
  if (size > MCP_UPLOAD_MAX_BYTES) {
    await response.body.cancel();
    throw new McpUploadError(
      413,
      "MCP로는 파일당 100MB까지 올릴 수 있습니다. 더 큰 파일은 대시보드에서 올려 주세요.",
    );
  }

  return {
    fileName:
      file.file_name?.trim() ||
      fileNameFromUrl(file.download_url) ||
      file.file_id,
    contentType: normalizeUploadContentType(
      file.mime_type ??
        response.headers.get("content-type") ??
        "application/octet-stream",
    ),
    size,
    body: response.body as ReadableStream<Uint8Array>,
  };
};
