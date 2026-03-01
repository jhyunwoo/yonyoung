import { describe, expect, it } from "vitest";
import { buildDashboardSettingsMenuItems } from "./dashboard-settings-menu";

describe("dashboard-settings-menu", () => {
  it("권한이 없으면 운영진 전용 설정 메뉴를 제외한다", () => {
    const items = buildDashboardSettingsMenuItems({
      canManagePrivilegedSettings: false,
    });
    const hrefs = items.map((item) => item.href);

    expect(hrefs).toContain("/dashboard/settings/notices");
    expect(hrefs).toContain("/dashboard/settings/members");
    expect(hrefs).not.toContain("/dashboard/settings/generations");
    expect(hrefs).not.toContain("/dashboard/settings/recruiting");
    expect(hrefs).not.toContain("/dashboard/settings/site");
  });

  it("권한이 있으면 운영진 전용 설정 메뉴를 포함한다", () => {
    const items = buildDashboardSettingsMenuItems({
      canManagePrivilegedSettings: true,
    });
    const generationItem = items.find(
      (item) => item.href === "/dashboard/settings/generations",
    );
    const siteSettingsItem = items.find(
      (item) => item.href === "/dashboard/settings/site",
    );
    const recruitingItem = items.find(
      (item) => item.href === "/dashboard/settings/recruiting",
    );

    expect(generationItem).not.toBeUndefined();
    expect(generationItem?.label).toBe("전체 기수 관리");
    expect(siteSettingsItem).not.toBeUndefined();
    expect(siteSettingsItem?.label).toBe("기본 설정");
    expect(recruitingItem).not.toBeUndefined();
    expect(recruitingItem?.label).toBe("모집 계획");
  });
});
