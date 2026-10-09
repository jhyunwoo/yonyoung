import { describe, expect, it } from "vitest";
import { groupToolsByCategory } from "@/features/mcp/mcp-tool-groups";

const tool = (name: string, category: "account" | "activities" | "stats") => ({
  name,
  title: name,
  description: "설명입니다. 열 글자 넘게.",
  category,
  readOnly: true,
  destructive: false,
  examplePrompt: "예시",
});

describe("groupToolsByCategory", () => {
  it("카탈로그 분류 순서대로 묶고 빈 분류는 뺀다", () => {
    const groups = groupToolsByCategory([
      tool("dashboard_overview", "stats"),
      tool("whoami", "account"),
      tool("activity_list", "activities"),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["내 계정", "활동", "통계·기록"]);
    expect(groups[0]?.tools.map((item) => item.name)).toEqual(["whoami"]);
  });
});
