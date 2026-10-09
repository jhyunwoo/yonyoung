import type { ServerResponse } from "node:http";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import type { MockRole } from "./contracts";

type McpHandlerContext = {
  pathname: string;
  method: string;
  response: ServerResponse;
  role: MockRole;
  namespace: string;
  sendData: <T>(response: ServerResponse, data: T, status?: number) => void;
  sendError: (
    response: ServerResponse,
    status: number,
    code: "NOT_FOUND",
    message: string,
  ) => void;
};

const MOCK_ROLE_TO_CORE: Record<Exclude<MockRole, "guest">, string> = {
  unverified: "unverified",
  member: "regular_member",
  manager: "manager",
  vice_president: "vice_president",
  president: "president",
};

// 모의 서버는 권한 매트릭스를 다시 구현하지 않는다. 부원은 읽기 도구, 그 위는 전체로 근사한다.
const toolsFor = (role: MockRole) =>
  MCP_TOOL_CATALOG.filter((tool) =>
    role === "unverified" ? false : role === "member" ? tool.readOnly : true,
  ).map(
    ({ name, title, description, category, readOnly, destructive, examplePrompt }) => ({
      name,
      title,
      description,
      category,
      readOnly,
      destructive,
      examplePrompt,
    }),
  );

// 휴대폰 너비에서 줄바꿈을 확인하기 위한 긴 주소. mcp-mobile 네임스페이스에만 쓴다.
const LONG_SERVER_URL =
  "https://api.yonyoung.example/mcp/with/a/deliberately/long/path/segment/for/wrapping/tests";

const connectionsByNamespace = new Map<string, Set<string>>();

const connectionsOf = (namespace: string) => {
  let set = connectionsByNamespace.get(namespace);
  if (!set) {
    set = new Set(["claude-client"]);
    connectionsByNamespace.set(namespace, set);
  }
  return set;
};

export const handleMcpRoutes = (ctx: McpHandlerContext): boolean => {
  const { pathname, method, response, role, namespace, sendData, sendError } = ctx;
  if (!pathname.startsWith("/api/mcp/") || role === "guest") {
    return false;
  }
  const overview = {
    serverUrl: namespace.startsWith("mcp-mobile")
      ? LONG_SERVER_URL
      : "https://api.yonyoung.example/mcp",
    role: MOCK_ROLE_TO_CORE[role],
    tools: toolsFor(role),
  };

  if (pathname === "/api/mcp/tools" && method === "GET") {
    sendData(response, overview);
    return true;
  }
  if (pathname === "/api/mcp/connections" && method === "GET") {
    sendData(
      response,
      [...connectionsOf(namespace)].map((clientId) => ({
        clientId,
        clientName: "Claude",
        clientUri: "https://claude.ai",
        scopes: ["openid", "mcp"],
        connectedAt: "2030-01-01T00:00:00.000Z",
        updatedAt: "2030-01-02T00:00:00.000Z",
      })),
    );
    return true;
  }
  if (pathname.startsWith("/api/mcp/connections/") && method === "DELETE") {
    const clientId = decodeURIComponent(pathname.split("/").pop() ?? "");
    if (!connectionsOf(namespace).delete(clientId)) {
      sendError(response, 404, "NOT_FOUND", "연결을 찾을 수 없습니다.");
      return true;
    }
    response.statusCode = 204;
    response.end();
    return true;
  }
  if (pathname === "/api/mcp/consent-context" && method === "GET") {
    sendData(response, {
      client: { clientId: "claude-client", name: "Claude", uri: "https://claude.ai" },
      redirectHost: "claude.ai",
      scopes: ["openid", "mcp"],
      overview,
    });
    return true;
  }
  return false;
};
