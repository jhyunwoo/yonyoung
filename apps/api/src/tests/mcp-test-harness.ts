import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
} from "@modelcontextprotocol/client";
import { createMemoryMcpObjectStore, type McpObjectStore } from "../features/mcp/files/mcp-object-store";
import { createMemoryMcpUploadStore, type McpUploadStore } from "../features/mcp/files/mcp-upload-store";
import {
  createMemoryMcpConnectionStore,
  type McpConnectionStore,
} from "../features/mcp/mcp-connection-store";
import type { Actor } from "../lib/authorization/types";
import type { AppDependencies } from "../lib/services/dependencies";
import type { DataService, PresignService } from "../lib/services/types";
import { createPresignServiceMock, createTestApp } from "./test-helpers";

export const TEST_MCP_CLIENT_ID = "test-mcp-client";
export const TEST_MCP_TOKEN = "test-token";

type TestApp = ReturnType<typeof createTestApp>;

/**
 * MCP 테스트 앱. 세션 쿠키는 없고, Bearer test-token이면 getActor()의 사용자로 인증된다.
 * getActor는 요청마다 다시 불리므로 테스트 중간에 역할을 바꿀 수 있다.
 */
export const createMcpTestApp = (input: {
  getActor: () => Actor | null;
  consent?: boolean;
  dataService?: DataService;
  presignService?: PresignService;
  connectionStore?: McpConnectionStore;
  uploadStore?: McpUploadStore;
  objectStore?: McpObjectStore;
  overrides?: Partial<AppDependencies>;
}): TestApp => {
  const uploadStore = input.uploadStore ?? createMemoryMcpUploadStore();
  const objectStore = input.objectStore ?? createMemoryMcpObjectStore();
  const initialActor = input.getActor();
  const connectionStore =
    input.connectionStore ??
    createMemoryMcpConnectionStore(
      initialActor && input.consent !== false
        ? [{ userId: initialActor.id, clientId: TEST_MCP_CLIENT_ID, clientName: "Claude" }]
        : [],
    );

  return createTestApp({
    actor: null,
    dataService: input.dataService,
    presignService: input.presignService ?? createPresignServiceMock({
      allocateManagedObject: async ({ actorId, resource, slot, fileName }) => {
        const objectKey = `${resource}/${actorId}/${slot}/${crypto.randomUUID()}-${fileName}`;
        return { objectKey, publicUrl: `https://cdn.example.test/${encodeURI(objectKey)}` };
      },
    }),
    overrides: {
      authenticateMcpRequest: async (c, onAuthenticated) => {
        if (c.req.header("authorization") !== `Bearer ${TEST_MCP_TOKEN}`) {
          return new Response(null, { status: 401 });
        }
        return onAuthenticated({
          userId: initialActor?.id ?? "missing-user",
          clientId: TEST_MCP_CLIENT_ID,
          scopes: ["mcp"],
        });
      },
      loadActorByUserId: async (_c, userId) => {
        const actor = input.getActor();
        return actor && actor.id === userId ? actor : null;
      },
      getMcpConnectionStore: () => connectionStore,
      getMcpUploadStore: () => uploadStore,
      getMcpObjectStore: () => objectStore,
      ...input.overrides,
    },
  });
};

/** env를 넘기면 바깥 요청과 내부 라우트 호출이 그 바인딩을 쓴다(예: 서명된 미디어 URL 검증). */
export const connectMcpClient = async (
  app: TestApp,
  options: { token?: string; env?: Record<string, unknown> } = {},
): Promise<Client> => {
  const client = new Client({ name: "yonyoung-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
    fetch: async (url, init) => app.request(url, init, options.env as never),
    requestInit: {
      headers: { authorization: `Bearer ${options.token ?? TEST_MCP_TOKEN}` },
    },
  });
  await client.connect(transport);
  return client;
};

export const resultText = (result: CallToolResult): string =>
  result.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n");

/** upload_prepare → put_url로 PUT까지 한다. 돌려받은 upload_id를 파일 도구에 넘긴다. */
export const uploadViaClaudePath = async (
  app: TestApp,
  client: Client,
  input: { purpose: string; fileName: string; contentType: string; bytes: Uint8Array },
): Promise<string> => {
  const prepared = await client.callTool({
    name: "upload_prepare",
    arguments: {
      purpose: input.purpose,
      file_name: input.fileName,
      content_type: input.contentType,
      size: input.bytes.length,
    },
  });
  if (prepared.isError) {
    throw new Error(resultText(prepared));
  }
  const data = (prepared.structuredContent as { data: { upload_id: string; put_url: string } })
    .data;
  const response = await app.request(new URL(data.put_url).pathname, {
    method: "PUT",
    headers: { "content-length": String(input.bytes.length) },
    body: input.bytes,
  });
  if (response.status !== 200) {
    throw new Error(`PUT 실패: ${response.status} ${await response.text()}`);
  }
  return data.upload_id;
};
