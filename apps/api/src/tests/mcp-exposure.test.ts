import { describe, expect, it } from "vitest";
import { CORE_ROLE_VALUES } from "@yonyoung/contracts/auth-roles";
import { MCP_TOOL_CATALOG } from "@yonyoung/contracts/mcp";
import { isToolExposed } from "../features/mcp/exposure";
import { createInternalApiClient } from "../features/mcp/internal-api";
import { MCP_TOOL_DEFINITIONS } from "../features/mcp/tools";
import type { McpToolContext } from "../features/mcp/tool-definition";
import type { Actor, Role } from "../lib/authorization/types";
import type { DataService } from "../lib/services/types";
import { connectMcpClient, createMcpTestApp, resultText } from "./mcp-test-harness";
import {
  IDs,
  buildManagedFileUrl,
  createActivity,
  createActor,
  createAttachment,
  createDataServiceMock,
  createExhibition,
  createGeneration,
  createLinktree,
  createTestApp,
  createUser,
} from "./test-helpers";

const VERIFIED_ROLES = CORE_ROLE_VALUES.filter((role) => role !== "unverified");

const ACTOR_ID_BY_ROLE: Record<Role, string> = {
  president: IDs.president,
  vice_president: IDs.vicePresident,
  manager: IDs.manager,
  new_member: IDs.member,
  associate_member: IDs.member,
  regular_member: IDs.member,
  unverified: IDs.member,
};

const generationData = {
  name: "99기",
  sortOrder: 99,
  startDate: Date.UTC(2030, 2, 1),
  endDate: Date.UTC(2031, 1, 28),
};

/** 라우트 검증을 통과하는 최소 입력. 검증에서 422가 나면 권한 판정까지 가지 못한다. */
const sampleArgs = (name: string, actor: Actor): Record<string, unknown> => {
  const samples: Record<string, Record<string, unknown>> = {
    generation_list: {},
    generation_get: { id: IDs.generation },
    generation_members: { id: IDs.generation },
    generation_create: { data: generationData },
    generation_update: { id: IDs.generation, data: { name: "99기" } },
    generation_reorder: {
      data: {
        items: [
          { id: IDs.generation, sortOrder: 1 },
          { id: IDs.generationAlt, sortOrder: 0 },
        ],
      },
    },
    generation_delete: { id: IDs.generation },
    activity_list: {},
    activity_get: { id: IDs.activity },
    activity_update: { id: IDs.activity, data: { title: "새 제목" } },
    activity_delete: { id: IDs.activity },
    activity_image_update: { id: IDs.activity, imageId: IDs.activityImage, data: { sortOrder: 1 } },
    activity_images_update: { id: IDs.activity, items: [{ imageId: IDs.activityImage, sortOrder: 1 }] },
    activity_image_delete: { id: IDs.activity, imageId: IDs.activityImage },
    exhibition_list: {},
    exhibition_get: { id: IDs.exhibition },
    exhibition_update: { id: IDs.exhibition, data: { title: "새 제목" } },
    exhibition_delete: { id: IDs.exhibition },
    exhibition_image_update: { id: IDs.exhibition, imageId: IDs.exhibitionImage, data: { sortOrder: 1 } },
    exhibition_images_update: {
      id: IDs.exhibition,
      items: [{ imageId: IDs.exhibitionImage, sortOrder: 1 }],
    },
    exhibition_image_delete: { id: IDs.exhibition, imageId: IDs.exhibitionImage },
    linktree_list: {},
    linktree_get: { id: IDs.linktree },
    linktree_create: { data: { name: "공식 링크" } },
    linktree_update: { id: IDs.linktree, data: { name: "새 이름" } },
    linktree_delete: { id: IDs.linktree },
    linktree_item_add: {
      id: IDs.linktree,
      data: { name: "인스타그램", link: "https://instagram.com/yonyoung" },
    },
    linktree_item_update: { id: IDs.linktree, itemId: IDs.linktreeItem, data: { name: "인스타" } },
    linktree_item_delete: { id: IDs.linktree, itemId: IDs.linktreeItem },
    attachment_list: { scope: "activity", resourceId: IDs.activity },
    attachment_create: {
      data: {
        scope: "activity",
        resourceId: IDs.activity,
        title: "자료",
        linkUrl: "https://docs.google.com/spreadsheets/d/abc",
      },
    },
    attachment_update: { id: IDs.attachment, data: { title: "새 제목" } },
    attachment_delete: { id: IDs.attachment },
    member_list: {},
    member_get: { id: actor.id },
    member_resource_history: { id: IDs.otherUser },
    member_update: { id: IDs.otherUser, data: { role: "regular_member" } },
    member_bulk_role: { data: { userIds: [IDs.otherUser], role: "regular_member" } },
    member_delete: { id: IDs.otherUser },
    my_profile_update: { data: { department: "시각디자인학과" } },
    site_settings_get: {},
    site_settings_update: { data: { footerPhone: "02-000-0000" } },
    recruiting_plan_get: {},
    recruiting_plan_upsert: {
      data: {
        title: "모집",
        content: "<p>모집합니다.</p>",
        promotionImageUrls: [],
        recruitmentStartAt: Date.UTC(2030, 2, 1),
        recruitmentEndAt: Date.UTC(2030, 2, 15),
      },
    },
    dashboard_overview: {},
    page_view_stats: {},
    page_view_dashboard: {},
    audit_log_get: { resourceType: "activity", resourceId: IDs.activity },
  };
  const sample = samples[name];
  if (!sample) {
    throw new Error(`${name}의 샘플 입력이 없습니다.`);
  }
  return sample;
};

/**
 * 조회 메서드만 고정 데이터를 돌려주고 나머지는 예외(→500)를 던진다.
 * 데이터를 읽은 뒤 권한을 판정하는 라우트도 403까지 도달하게 한다.
 */
const createExposureDataService = (): DataService =>
  createDataServiceMock({
    getGenerationById: async () => createGeneration(),
    getActivityById: async () => createActivity(),
    getExhibitionById: async () => createExhibition(),
    getLinktreeById: async () => createLinktree(),
    // 기본 픽스처는 회장단 전용인 site_donate다. 노출 조건(활동 자료 기준)과 맞추려면 activity 자료로 둔다.
    getAttachmentById: async () =>
      createAttachment({
        scope: "activity",
        resourceId: IDs.activity,
        fileUrl: buildManagedFileUrl("activities"),
      }),
    getUserById: async (id: string) => createUser({ id, role: "regular_member" }),
    listUsersByIds: async (ids: string[]) =>
      ids.map((id) => createUser({ id, role: "regular_member" })),
    listUsersByGenerationIds: async () => [],
    countUsersByRole: async () => 2,
  });

describe("노출 조건 ↔ 라우트 가드 일치", () => {
  const routeTools = [...MCP_TOOL_DEFINITIONS.values()].filter((tool) => tool.route);

  it.each(VERIFIED_ROLES)("%s: 노출된 도구는 403이 아니고 숨긴 도구는 403이다", async (role) => {
    // generation_members는 회장단 외에는 본인 기수만 조회할 수 있으므로 샘플 기수에 소속시킨다.
    const actor = { ...createActor(role, ACTOR_ID_BY_ROLE[role]), generationId: IDs.generation };
    const app = createTestApp({ actor: null, dataService: createExposureDataService() });
    const api = createInternalApiClient({
      dispatch: (request, env) => app.fetch(request, env as never),
      env: undefined,
      actor,
      origin: "http://localhost",
      requestId: "exposure-test",
    });
    const context: McpToolContext = { actor, api } as McpToolContext;

    const mismatches: string[] = [];
    for (const tool of routeTools) {
      const entry = MCP_TOOL_CATALOG.find((item) => item.name === tool.name)!;
      const exposed = isToolExposed(entry.exposure, role);
      const result = await api.call(tool.route!.buildRequest(sampleArgs(tool.name, actor), context));
      if (result.ok === false && (result.status === 400 || result.status === 422)) {
        mismatches.push(`${tool.name}: 샘플 입력이 검증에서 거부됨 (${result.message})`);
        continue;
      }
      const forbidden = !result.ok && result.status === 403;
      if (exposed === forbidden) {
        mismatches.push(
          `${tool.name}: 노출=${exposed}, 라우트 응답=${result.ok ? result.status : result.status}`,
        );
      }
    }

    expect(mismatches).toEqual([]);
  });
});

describe("MCP 경유 권한 위임", () => {
  it("마지막 회장은 MCP로도 본인을 강등할 수 없다", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({
        getActor: () => createActor("president", IDs.president),
        dataService: createDataServiceMock({
          getUserById: async () => createUser({ id: IDs.president, role: "president" }),
          countUsersByRole: async () => 1,
        }),
      }),
    );

    const result = await client.callTool({
      name: "member_update",
      arguments: { id: IDs.president, data: { role: "regular_member" } },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toContain("회장 권한은 최소 1명 이상 유지되어야 합니다.");
  });

  it("부회장은 MCP로 기수를 삭제할 수 없다(도구가 보이지 않는다)", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("vice_president", IDs.vicePresident) }),
    );
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain("generation_delete");
  });

  it("부원은 다른 멤버 프로필을 수정할 수 없다(도구가 보이지 않는다)", async () => {
    const client = await connectMcpClient(
      createMcpTestApp({ getActor: () => createActor("regular_member", IDs.member) }),
    );
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).not.toContain("member_update");
  });
});
