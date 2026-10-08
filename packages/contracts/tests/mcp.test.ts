import { describe, expect, it } from "vitest";
import { CORE_ROLE_LABELS, CORE_ROLE_VALUES } from "../src/auth-roles";
import {
  MCP_TOOL_CATALOG,
  MCP_TOOL_CATEGORY_LABELS,
  MCP_UPLOAD_MAX_BYTES,
  apiMcpOverviewSchema,
} from "../src/api/mcp";

describe("MCP 도구 카탈로그", () => {
  it("도구 이름은 고유한 snake_case다", () => {
    const names = MCP_TOOL_CATALOG.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("스펙의 도구 56개를 모두 담는다", () => {
    expect(MCP_TOOL_CATALOG).toHaveLength(56);
  });

  it("파괴적 도구는 읽기 전용일 수 없다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      if (tool.destructive) {
        expect(tool.readOnly, tool.name).toBe(false);
      }
    }
  });

  it("모든 분류에 한국어 이름이 있고 설명·예시가 비어 있지 않다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      expect(MCP_TOOL_CATEGORY_LABELS[tool.category], tool.name).toBeTruthy();
      expect(tool.description.length, tool.name).toBeGreaterThan(10);
      expect(tool.examplePrompt.length, tool.name).toBeGreaterThan(3);
    }
  });

  it("permission 노출은 권한을 하나 이상 가진다", () => {
    for (const tool of MCP_TOOL_CATALOG) {
      if (tool.exposure.kind === "permission") {
        expect(tool.exposure.anyOf.length, tool.name).toBeGreaterThan(0);
      }
    }
  });

  it("파일 인자를 가진 도구 목록이 고정되어 있다", () => {
    const fileTools = MCP_TOOL_CATALOG.filter(
      (tool) => tool.fileArgs.length > 0,
    )
      .map((tool) => tool.name)
      .sort();
    expect(fileTools).toEqual([
      "activity_create",
      "activity_images_add",
      "activity_update",
      "attachment_create",
      "exhibition_create",
      "exhibition_images_add",
      "exhibition_update",
      "my_profile_photo_set",
      "recruiting_plan_upsert",
    ]);
  });
});

describe("역할 이름", () => {
  it("모든 역할에 웹과 같은 한국어 이름이 있다", () => {
    for (const role of CORE_ROLE_VALUES) {
      expect(CORE_ROLE_LABELS[role]).toBeTruthy();
    }
    expect(CORE_ROLE_LABELS.manager).toBe("부장");
  });
});

describe("MCP 응답 스키마", () => {
  it("overview를 파싱한다", () => {
    const parsed = apiMcpOverviewSchema.parse({
      serverUrl: "https://api.yonyoung.moveto.kr/mcp",
      role: "manager",
      tools: [
        {
          name: "activity_list",
          title: "활동 목록",
          description: "활동 목록을 조회합니다.",
          category: "activities",
          readOnly: true,
          destructive: false,
          examplePrompt: "25기 활동 목록 보여줘",
        },
      ],
    });
    expect(parsed.tools[0]?.name).toBe("activity_list");
  });

  it("업로드 한도는 100MB(10진)다", () => {
    expect(MCP_UPLOAD_MAX_BYTES).toBe(100_000_000);
  });
});
