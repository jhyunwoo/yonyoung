import { describe, expect, it } from "vitest";
import { createMemoryMcpConnectionStore } from "../features/mcp/mcp-connection-store";
import { IDs, createActor, createTestApp } from "./test-helpers";

const createWebApp = (input: {
  actor: ReturnType<typeof createActor> | null;
  verified?: boolean;
}) => {
  const connections = createMemoryMcpConnectionStore([
    { userId: IDs.manager, clientId: "claude-client", clientName: "Claude" },
  ]);
  return {
    connections,
    app: createTestApp({
      actor: input.actor,
      overrides: {
        getMcpConnectionStore: () => connections,
        verifyOAuthConsentQuery: async () => input.verified ?? true,
      },
    }),
  };
};

describe("GET /api/mcp/tools", () => {
  it("로그인하지 않으면 401이다", async () => {
    const { app } = createWebApp({ actor: null });
    expect((await app.request("/api/mcp/tools")).status).toBe(401);
  });

  it("역할에 맞는 도구와 커넥터 URL을 준다", async () => {
    const { app } = createWebApp({ actor: createActor("regular_member") });
    const body = (await (await app.request("/api/mcp/tools")).json()) as {
      data: { serverUrl: string; role: string; tools: Array<{ name: string }> };
    };
    expect(body.data.serverUrl).toBe("http://localhost:8787/mcp");
    expect(body.data.role).toBe("regular_member");
    const names = body.data.tools.map((tool) => tool.name);
    expect(names).toContain("whoami");
    expect(names).not.toContain("dashboard_overview");
  });

  it("승인 대기 사용자는 빈 목록을 받는다", async () => {
    const { app } = createWebApp({ actor: createActor("unverified") });
    const body = (await (await app.request("/api/mcp/tools")).json()) as {
      data: { tools: unknown[] };
    };
    expect(body.data.tools).toEqual([]);
  });
});

describe("/api/mcp/connections", () => {
  it("내 연결만 보여주고 해제한다", async () => {
    const { app, connections } = createWebApp({ actor: createActor("manager", IDs.manager) });
    const list = (await (await app.request("/api/mcp/connections")).json()) as {
      data: Array<{ clientId: string; clientName: string }>;
    };
    expect(list.data).toMatchObject([{ clientId: "claude-client", clientName: "Claude" }]);

    const removed = await app.request("/api/mcp/connections/claude-client", { method: "DELETE" });
    expect(removed.status).toBe(204);
    expect(await connections.hasConsent(IDs.manager, "claude-client")).toBe(false);
  });

  it("다른 사람의 연결은 404다", async () => {
    const { app } = createWebApp({ actor: createActor("regular_member", IDs.member) });
    const removed = await app.request("/api/mcp/connections/claude-client", { method: "DELETE" });
    expect(removed.status).toBe(404);
  });
});

describe("GET /api/mcp/consent-context", () => {
  const query = "client_id=claude-client&scope=openid+mcp&exp=1&sig=abc";

  it("서명이 맞으면 앱 이름과 내 도구를 준다", async () => {
    const { app } = createWebApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request(`/api/mcp/consent-context?${query}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { client: { name: string }; scopes: string[]; overview: { tools: unknown[] } };
    };
    expect(body.data.client.name).toBe("Claude");
    expect(body.data.scopes).toEqual(["openid", "mcp"]);
    expect(body.data.overview.tools.length).toBeGreaterThan(0);
  });

  it("돌아갈 redirect_uri의 호스트를 준다", async () => {
    const { app } = createWebApp({ actor: createActor("manager", IDs.manager) });
    const redirectHostOf = async (extra: string) => {
      const response = await app.request(`/api/mcp/consent-context?${query}${extra}`);
      return ((await response.json()) as { data: { redirectHost: string | null } }).data
        .redirectHost;
    };
    const redirect = encodeURIComponent("https://evil.example:8443/callback?x=1");
    expect(await redirectHostOf(`&redirect_uri=${redirect}`)).toBe("evil.example:8443");
    expect(await redirectHostOf("&redirect_uri=not-a-url")).toBeNull();
    expect(await redirectHostOf("")).toBeNull();
  });

  it("서명이 틀리면 400이다", async () => {
    const { app } = createWebApp({ actor: createActor("manager", IDs.manager), verified: false });
    expect((await app.request(`/api/mcp/consent-context?${query}`)).status).toBe(400);
  });
});
