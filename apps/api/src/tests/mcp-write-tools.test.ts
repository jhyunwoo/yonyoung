import { describe, expect, it, vi } from "vitest";
import { connectMcpClient, createMcpTestApp, resultText } from "./mcp-test-harness";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createLinktree,
  createUser,
} from "./test-helpers";

describe("쓰기 도구", () => {
  it("generation_create는 data를 그대로 본문으로 보낸다", async () => {
    const createGenerationMock = vi.fn(async () => createGeneration());
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
        dataService: createDataServiceMock({ createGeneration: createGenerationMock }),
      }),
    );

    const data = {
      name: "99기",
      sortOrder: 99,
      startDate: Date.UTC(2030, 2, 1),
      endDate: Date.UTC(2031, 1, 28),
    };
    const result = await client.callTool({ name: "generation_create", arguments: { data } });

    expect(result.isError).toBeFalsy();
    expect(createGenerationMock).toHaveBeenCalledWith(expect.objectContaining({ name: "99기" }));
  });

  it("my_profile_update는 항상 본인 ID로 보낸다", async () => {
    const actor = createActor("regular_member", IDs.member);
    const updateUser = vi.fn(async () => createUser({ id: IDs.member, department: "시각디자인학과" }));
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => actor,
        dataService: createDataServiceMock({
          getUserById: async () => createUser({ id: IDs.member }),
          updateUser,
        }),
      }),
    );

    const result = await client.callTool({
      name: "my_profile_update",
      arguments: { data: { department: "시각디자인학과" } },
    });

    expect(result.isError).toBeFalsy();
    expect(updateUser).toHaveBeenCalledWith(IDs.member, { department: "시각디자인학과" });
  });

  it("linktree_item_delete는 경로 파라미터를 채워 DELETE를 보낸다", async () => {
    const deleteLinktreeItem = vi.fn(async () => true);
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("manager", IDs.manager),
        dataService: createDataServiceMock({
          getLinktreeById: async () => createLinktree(),
          deleteLinktreeItem,
        }),
      }),
    );

    const result = await client.callTool({
      name: "linktree_item_delete",
      arguments: { id: IDs.linktree, itemId: IDs.linktreeItem },
    });

    expect(result.isError).toBeFalsy();
    expect(deleteLinktreeItem).toHaveBeenCalled();
  });

  it("파괴적 도구에는 destructiveHint가 붙는다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("president", IDs.president) }),
    );
    const { tools } = await client.listTools();
    const destructive = tools
      .filter((tool) => tool.annotations?.destructiveHint === true)
      .map((tool) => tool.name);
    expect(destructive).toEqual(
      expect.arrayContaining(["generation_delete", "member_update", "member_delete"]),
    );
  });

  it("라우트가 거부하면 역할과 사유를 담은 오류를 돌려준다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("vice_president", IDs.vicePresident),
        dataService: createDataServiceMock({
          getUserById: async () => createUser({ id: IDs.president, role: "president" }),
        }),
      }),
    );

    const result = await client.callTool({
      name: "member_update",
      arguments: { id: IDs.president, data: { role: "regular_member" } },
    });

    expect(result.isError).toBe(true);
    const text = resultText(result);
    expect(text).toContain("현재 역할(부회장)");
    expect(text).toContain("본인보다 높거나 같은 등급의 사용자는 변경할 수 없습니다.");
  });
});
