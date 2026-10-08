import type { McpUploadPurpose } from "@yonyoung/contracts/mcp";
import type { Actor } from "../../../lib/authorization/types";
import { downloadChatGptFile, type ChatGptFileRef } from "./chatgpt-file";
import { toResolvedUpload, type McpUploadService, type ResolvedUpload } from "./mcp-upload-service";

export type McpFileResolver = {
  /** ChatGPT 파일은 내려받아 저장하고, upload_id는 완료 여부를 확인한다. ChatGPT 파일이 먼저 온다. */
  resolve: (input: {
    purpose: McpUploadPurpose;
    chatGptFiles?: ChatGptFileRef[];
    uploadIds?: string[];
  }) => Promise<ResolvedUpload[]>;
  /** 도구가 라우트를 부르기 직전에 업로드를 소비 상태로 잡는다. */
  claim: (files: ResolvedUpload[]) => Promise<void>;
  /** 라우트 호출이 실패하면 되돌려 다시 쓸 수 있게 한다. */
  release: (files: ResolvedUpload[]) => Promise<void>;
};

export const createMcpFileResolver = (input: {
  actor: Actor;
  uploads: McpUploadService;
  fetch: (request: Request) => Promise<Response>;
  hostSuffixes: readonly string[];
}): McpFileResolver => ({
  async resolve({ purpose, chatGptFiles = [], uploadIds = [] }) {
    // 싼 검사를 먼저 끝내 둔다. 다운로드한 뒤에 실패하면 저장된 파일이 고아가 된다.
    input.uploads.assertPurposeAllowed(input.actor, purpose);
    const fromUploadIds = await input.uploads.resolveCompleted(input.actor, purpose, uploadIds);
    const ingested: ResolvedUpload[] = [];
    try {
      for (const file of chatGptFiles) {
        const downloaded = await downloadChatGptFile(file, {
          fetch: input.fetch,
          hostSuffixes: input.hostSuffixes,
        });
        const record = await input.uploads.ingest(input.actor, { purpose, ...downloaded });
        ingested.push(toResolvedUpload(record));
      }
    } catch (error) {
      await input.uploads.discard(input.actor, ingested);
      throw error;
    }
    return [...ingested, ...fromUploadIds];
  },
  claim: (files) => input.uploads.claim(input.actor, files),
  release: (files) => input.uploads.release(files),
});
