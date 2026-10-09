import { captureException } from "@sentry/cloudflare";
import { describe, expect, it, vi } from "vitest";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { createMemoryMcpUploadStore } from "../features/mcp/files/mcp-upload-store";
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

vi.mock("@sentry/cloudflare", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  captureException: vi.fn(),
}));

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

describe("MCP 엔드포인트 거부 응답", () => {
  const postInitialize = (app: ReturnType<typeof createMcpTestApp>) =>
    app.request("/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "yonyoung-test", version: "1.0.0" },
        },
      }),
    });

  it("승인 대기 사용자는 403과 안내 문구를 받는다", async () => {
    const response = await postInitialize(
      createMcpTestApp({ getActor: () => createActor("unverified") }),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toBe("관리자 승인 후 사용할 수 있습니다.");
  });

  it("동의가 해제된 연결은 401과 resource_metadata를 받는다", async () => {
    const response = await postInitialize(
      createMcpTestApp({ getActor: () => createActor("regular_member"), consent: false }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  it("삭제된 사용자는 401과 resource_metadata를 받는다", async () => {
    const actor = createActor("regular_member");
    let current: typeof actor | null = actor;
    const app = createMcpTestApp({ getActor: () => current });
    current = null;
    const response = await postInitialize(app);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
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

describe("도구 안의 예상하지 못한 오류", () => {
  it("원문을 감추고 Sentry에 기록한 뒤 요청 ID를 알려준다", async () => {
    vi.mocked(captureException).mockClear();
    const uploadStore = createMemoryMcpUploadStore();
    uploadStore.create = async () => {
      throw new Error("D1_ERROR: database is locked");
    };
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("manager", IDs.manager),
        uploadStore,
      }),
    );

    const result = await client.callTool({
      name: "upload_prepare",
      arguments: {
        purpose: "activity_image",
        file_name: "a.png",
        content_type: "image/png",
        size: 10,
      },
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, hint] = vi.mocked(captureException).mock.calls[0]!;
    expect((error as Error).message).toBe("D1_ERROR: database is locked");
    const requestId = (hint as { tags: { requestId: string; tool: string } }).tags
      .requestId;
    expect(requestId).toBeTruthy();
    expect(hint).toMatchObject({ tags: { tool: "upload_prepare" } });
    expect(result.isError).toBe(true);
    const text = resultText(result);
    expect(text).toContain("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    expect(text).toContain(`요청 ID: ${requestId}`);
    expect(text).not.toContain("D1_ERROR");
  });
});
