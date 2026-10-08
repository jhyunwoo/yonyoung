import { describe, expect, it, vi } from "vitest";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import {
  connectMcpClient,
  createMcpTestApp,
  resultText,
} from "./mcp-test-harness";
import {
  IDs,
  createActivity,
  createActor,
  createDataServiceMock,
  createUser,
} from "./test-helpers";

const listToolNames = async (getActor: () => ReturnType<typeof createActor>) => {
  const client = await connectMcpClient(createMcpTestApp({ getActor }));
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name);
};

describe("MCP 엔드포인트 인증", () => {
  it("토큰이 틀리면 연결되지 않는다", async () => {
    const app = createMcpTestApp({ getActor: () => createActor("regular_member") });
    await expect(connectMcpClient(app, { token: "wrong-token" })).rejects.toThrow();
  });

  it("동의가 해제된 연결은 거부한다", async () => {
    const app = createMcpTestApp({
      getActor: () => createActor("regular_member"),
      consent: false,
    });
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("승인 대기 사용자는 연결되지 않는다", async () => {
    const app = createMcpTestApp({ getActor: () => createActor("unverified") });
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("삭제된 사용자는 연결되지 않는다", async () => {
    const actor = createActor("regular_member");
    let current: typeof actor | null = actor;
    const app = createMcpTestApp({ getActor: () => current });
    current = null;
    await expect(connectMcpClient(app)).rejects.toThrow();
  });

  it("GET /mcp는 405다", async () => {
    const app = createMcpTestApp({ getActor: () => createActor("regular_member") });
    const response = await app.request("/mcp");
    expect(response.status).toBe(405);
  });
});

describe("역할별 도구 목록", () => {
  it("부원은 조회 도구와 본인 도구만 본다", async () => {
    const names = await listToolNames(() => createActor("regular_member"));
    expect(names).toContain("whoami");
    expect(names).toContain("activity_list");
    expect(names).not.toContain("dashboard_overview");
    expect(names).not.toContain("generation_create");
  });

  it("부장은 통계를 보지만 기수를 만들지 못한다", async () => {
    const names = await listToolNames(() => createActor("manager", IDs.manager));
    expect(names).toContain("dashboard_overview");
    expect(names).not.toContain("generation_create");
    expect(names).not.toContain("member_resource_history");
  });

  it("도구 정의는 카탈로그에 있는 이름만 쓴다", () => {
    const catalogNames = new Set<string>(MCP_TOOL_CATALOG.map((tool) => tool.name));
    for (const name of MCP_TOOL_DEFINITIONS.keys()) {
      expect(catalogNames.has(name), name).toBe(true);
    }
  });

  it("조회 도구에는 readOnlyHint를 붙인다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("regular_member") }),
    );
    const { tools } = await client.listTools();
    const activityList = tools.find((tool) => tool.name === "activity_list");
    expect(activityList?.annotations?.readOnlyHint).toBe(true);
    expect(activityList?.annotations?.destructiveHint).toBe(false);
  });
});

describe("조회 도구 호출", () => {
  it("activity_list는 기존 라우트를 그대로 호출한다", async () => {
    const listActivities = vi.fn(async () => [createActivity()]);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("regular_member"),
        dataService: createDataServiceMock({ listActivities }),
      }),
    );

    const result = await client.callTool({
      name: "activity_list",
      arguments: { generationId: IDs.generation },
    });

    expect(result.isError).toBeFalsy();
    expect(resultText(result)).toContain("활동 목록입니다.");
    expect(listActivities).toHaveBeenCalledTimes(1);
  });

  it("whoami는 역할 이름과 쓸 수 있는 도구를 알려준다", async () => {
    const actor = createActor("manager", IDs.manager);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({
          getUserById: async () => createUser({ id: IDs.manager, role: "manager" }),
        }),
      }),
    );

    const result = await client.callTool({ name: "whoami", arguments: {} });
    expect(resultText(result)).toContain("부장");
    const data = (result.structuredContent as { data: { tools: Array<{ name: string }> } }).data;
    expect(data.tools.map((tool) => tool.name)).toContain("dashboard_overview");
  });

  it("역할이 강등되면 숨겨진 도구를 더는 실행하지 못한다", async () => {
    let actor = createActor("manager", IDs.manager);
    const deleteActivity = vi.fn(async () => true);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({ deleteActivity }),
      }),
    );
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain(
      "activity_delete",
    );

    actor = createActor("regular_member", IDs.manager);
    const outcome = await client
      .callTool({ name: "activity_delete", arguments: { id: IDs.activity } })
      .then(
        (result) => result.isError === true,
        () => true,
      );

    expect(outcome).toBe(true);
    expect(deleteActivity).not.toHaveBeenCalled();
  });
});
