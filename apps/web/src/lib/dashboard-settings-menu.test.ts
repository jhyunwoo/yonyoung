import { describe, expect, it } from "vitest";
import { buildDashboardSettingsMenuItems } from "./dashboard-settings-menu";

describe("dashboard-settings-menu", () => {
  it("회장이 아니면 전체 기수 관리 메뉴를 제외한다", () => {
    const items = buildDashboardSettingsMenuItems({ isPresident: false });
    const hrefs = items.map((item) => item.href);

    expect(hrefs).toContain("/dashboard/settings/notices");
    expect(hrefs).toContain("/dashboard/settings/members");
    expect(hrefs).not.toContain("/dashboard/settings/generations");
  });

  it("회장이면 전체 기수 관리 메뉴를 포함한다", () => {
    const items = buildDashboardSettingsMenuItems({ isPresident: true });
    const generationItem = items.find(
      (item) => item.href === "/dashboard/settings/generations",
    );

    expect(generationItem).not.toBeUndefined();
    expect(generationItem?.label).toBe("전체 기수 관리");
  });
});
