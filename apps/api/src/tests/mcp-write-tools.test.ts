import { describe, expect, it, vi } from "vitest";
import { connectMcpClient, createMcpTestApp, resultText } from "./mcp-test-harness";
import {
  IDs,
  createActivity,
  createActor,
  createDataServiceMock,
  createExhibition,
  createGeneration,
  createLinktree,
  createUser,
} from "./test-helpers";

const WEB_ENV = { MCP_AUTH_ISSUER: "https://web.example.test/api/auth" };

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

describe("생성 도구와 대시보드 주소", () => {
  const activityData = {
    title: "봄 출사",
    description: "<p>출사를 다녀왔습니다.</p>",
    startDate: Date.UTC(2030, 3, 1),
    endDate: Date.UTC(2030, 3, 2),
    generationId: IDs.generation,
  };

  it("activity_create는 커버가 없으면 기본 이미지로 만들고 수정 화면 주소를 준다", async () => {
    const createActivityMock = vi.fn(async () => createActivity());
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("manager", IDs.manager),
        dataService: createDataServiceMock({
          createActivity: createActivityMock,
          getGenerationById: async () => createGeneration(),
        }),
      }),
      { env: WEB_ENV },
    );

    const result = await client.callTool({
      name: "activity_create",
      arguments: { data: activityData },
    });

    expect(result.isError).toBeFalsy();
    expect(createActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        coverImageUrl: "https://web.example.test/yonyoung-logo-black.png",
      }),
    );
    const dashboardUrl = `https://web.example.test/dashboard/${encodeURIComponent("10기")}/activities/${IDs.activity}/edit`;
    expect(result.structuredContent).toMatchObject({
      data: { id: IDs.activity, dashboard_url: dashboardUrl },
    });
    const text = resultText(result);
    expect(text).toContain("커버는 기본 이미지로 넣었습니다.");
    expect(text).toContain(dashboardUrl);
  });

  it("exhibition_create는 넘긴 커버 URL을 그대로 쓴다", async () => {
    const createExhibitionMock = vi.fn(async () => createExhibition());
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
        dataService: createDataServiceMock({
          createExhibition: createExhibitionMock,
          getGenerationById: async () => createGeneration(),
        }),
      }),
      { env: WEB_ENV },
    );

    const coverImageUrl = "https://cdn.example.test/exhibitions/cover.jpg";
    const result = await client.callTool({
      name: "exhibition_create",
      arguments: {
        data: {
          title: "가을 정기전",
          startDate: Date.UTC(2030, 9, 1),
          endDate: Date.UTC(2030, 9, 7),
          generationId: IDs.generation,
          place: "학생회관 갤러리",
          description: "<p>정기전입니다.</p>",
          coverImageUrl,
        },
      },
    });

    expect(result.isError).toBeFalsy();
    expect(createExhibitionMock).toHaveBeenCalledWith(
      expect.objectContaining({ coverImageUrl }),
    );
    expect(result.structuredContent).toMatchObject({
      data: {
        dashboard_url: `https://web.example.test/dashboard/${encodeURIComponent("10기")}/exhibitions/${IDs.exhibition}/edit`,
      },
    });
    expect(resultText(result)).not.toContain("기본 이미지");
  });

  it("생성이 실패하면 대시보드 주소 없이 오류를 돌려준다", async () => {
    // createActivity를 넣지 않은 목은 호출되면 던지므로 라우트가 500으로 끝난다.
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("manager", IDs.manager) }),
    );

    const result = await client.callTool({
      name: "activity_create",
      arguments: { data: activityData },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).not.toContain("/dashboard/");
  });
});
