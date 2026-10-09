import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolResult,
} from "@modelcontextprotocol/client";
import {
  createMemoryMcpConnectionStore,
  type McpConnectionStore,
} from "../features/mcp/mcp-connection-store";
import type { Actor } from "../lib/authorization/types";
import type { AppDependencies } from "../lib/services/dependencies";
import type { DataService } from "../lib/services/types";
import { createTestApp } from "./test-helpers";

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
  connectionStore?: McpConnectionStore;
  overrides?: Partial<AppDependencies>;
}): TestApp => {
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

