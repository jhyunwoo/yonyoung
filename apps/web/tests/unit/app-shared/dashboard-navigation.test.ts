import { describe, expect, it } from "vitest";

import {
  buildNavigationItems,
  isSettingsSectionPath,
  resolveActiveGenerationFromPath,
  resolveActivePageName,
  resolveSelectedGenerationScopedPath,
} from "@/app/(dashboard)/_components/shell/dashboard-navigation";
import type { DashboardGenerationOption } from "@/features/dashboard/generation/generation-options";

const GENERATIONS: DashboardGenerationOption[] = [
  { id: "g25", name: "25기", path: "/dashboard/25기" },
  { id: "g24", name: "24기", path: "/dashboard/24기" },
] as DashboardGenerationOption[];

describe("resolveActiveGenerationFromPath", () => {
  it("기수 경로에서 해당 기수를 찾는다", () => {
    expect(resolveActiveGenerationFromPath("/dashboard/25기", GENERATIONS)?.id).toBe(
      "g25",
    );
    expect(
      resolveActiveGenerationFromPath("/dashboard/24기/activities/3", GENERATIONS)?.id,
    ).toBe("g24");
  });

  it("기수가 아닌 경로에서는 null 을 돌려준다", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/settings",
      "/dashboard/settings/members",
      "/dashboard/profile",
      "/",
      "/auth/sign-in",
    ]) {
      expect(resolveActiveGenerationFromPath(pathname, GENERATIONS)).toBeNull();
    }
  });

  it("접근 권한이 없는 기수 이름은 매칭되지 않는다", () => {
    expect(resolveActiveGenerationFromPath("/dashboard/23기", GENERATIONS)).toBeNull();
  });
});

describe("resolveSelectedGenerationScopedPath", () => {
  it.each([
    ["/dashboard/25기", "/"],
    ["/dashboard/25기/activities", "/activities"],
    ["/dashboard/25기/activities/3/edit", "/activities/3/edit"],
  ])("%s → %s", (pathname, expected) => {
    expect(resolveSelectedGenerationScopedPath(pathname)).toBe(expected);
  });

  it.each(["/dashboard", "/dashboard/settings/site", "/dashboard/profile", "/"])(
    "%s 는 기수 범위가 아니다",
    (pathname) => {
      expect(resolveSelectedGenerationScopedPath(pathname)).toBeNull();
    },
  );
});

describe("buildNavigationItems", () => {
  it("기수 밖에서는 접근 가능한 기수 목록을 보여준다", () => {
    const items = buildNavigationItems({
      pathname: "/dashboard",
      generationOptions: GENERATIONS,
      selectedGeneration: null,
      selectedGenerationScopedPath: null,
    });

    expect(items.map((item) => item.key)).toEqual([
      "generation-g25",
      "generation-g24",
      "stats",
      "homepage",
    ]);
  });

  it("기수 안에서는 그 기수의 하위 메뉴로 전환한다", () => {
    const items = buildNavigationItems({
      pathname: "/dashboard/25기/activities",
      generationOptions: GENERATIONS,
      selectedGeneration: GENERATIONS[0],
      selectedGenerationScopedPath: "/activities",
    });

    expect(items.map((item) => item.key)).toEqual([
      "dashboard-home",
      "generation-home",
      "generation-activities",
      "generation-exhibitions",
      "generation-members",
      "stats",
      "homepage",
    ]);

    const active = items.filter((item) => item.active).map((item) => item.key);
    expect(active).toEqual(["generation-activities"]);
  });

  it("하위 경로에서도 상위 메뉴가 활성으로 남는다", () => {
    const items = buildNavigationItems({
      pathname: "/dashboard/25기/exhibitions/7/edit",
      generationOptions: GENERATIONS,
      selectedGeneration: GENERATIONS[0],
      selectedGenerationScopedPath: "/exhibitions/7/edit",
    });

    expect(items.find((item) => item.key === "generation-exhibitions")?.active).toBe(
      true,
    );
  });
});

describe("isSettingsSectionPath", () => {
  it.each(["/dashboard/settings", "/dashboard/settings/members", "/dashboard/profile"])(
    "%s 는 설정 섹션이다",
    (pathname) => {
      expect(isSettingsSectionPath(pathname)).toBe(true);
    },
  );

  it.each(["/dashboard", "/dashboard/stats", "/dashboard/25기"])(
    "%s 는 설정 섹션이 아니다",
    (pathname) => {
      expect(isSettingsSectionPath(pathname)).toBe(false);
    },
  );
});

describe("resolveActivePageName", () => {
  it.each([
    ["/dashboard", null, null, "홈"],
    ["/dashboard/profile", null, null, "내 프로필"],
    ["/dashboard/settings/site", null, null, "설정"],
  ])("%s → %s", (pathname, _generation, scopedPath, expected) => {
    expect(
      resolveActivePageName({
        pathname,
        selectedGeneration: null,
        selectedGenerationScopedPath: scopedPath as string | null,
      }),
    ).toBe(expected);
  });

  it.each([
    ["/", "25기"],
    ["/activities", "활동"],
    ["/exhibitions/3", "전시"],
    ["/members", "기수 멤버"],
  ])("기수 범위 %s → %s", (scopedPath, expected) => {
    expect(
      resolveActivePageName({
        pathname: `/dashboard/25기${scopedPath === "/" ? "" : scopedPath}`,
        selectedGeneration: GENERATIONS[0],
        selectedGenerationScopedPath: scopedPath,
      }),
    ).toBe(expected);
  });
});
