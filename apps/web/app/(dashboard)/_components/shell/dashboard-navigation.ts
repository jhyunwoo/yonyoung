import {
  ArrowLeft,
  BarChart3,
  Camera,
  FolderKanban,
  House,
  Image as ImageIcon,
  Users,
  type LucideIcon,
} from "lucide-react";

import { isSameGenerationRouteName } from "@/features/dashboard/generation/dashboard-generation-route";
import type { DashboardGenerationOption } from "@/features/dashboard/generation/generation-options";

/**
 * 대시보드 사이드바 내비게이션의 순수 로직.
 *
 * dashboard-shell.tsx(709줄)에서 분리했다. 렌더링과 무관한 경로 파싱 · 메뉴
 * 구성이라 유닛 테스트로 고정할 수 있다
 * (tests/unit/app-shared/dashboard-navigation.test.ts).
 */

export type NavigationItem = {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
};

/** URL 에서 현재 보고 있는 기수를 찾는다. 라우트 파라미터가 아니라 경로 문자열 기준. */
export const resolveActiveGenerationFromPath = (
  pathname: string,
  generationOptions: DashboardGenerationOption[],
): DashboardGenerationOption | null => {
  if (!pathname.startsWith("/dashboard/")) {
    return null;
  }

  const routeName = pathname.slice("/dashboard/".length).split("/")[0];
  if (!routeName || routeName === "settings" || routeName === "profile") {
    return null;
  }

  return (
    generationOptions.find((generation) =>
      isSameGenerationRouteName(generation.name, routeName),
    ) ?? null
  );
};

/** 기수 경로 내부의 상대 경로. `/dashboard/25기/activities/3` → `/activities/3` */
export const resolveSelectedGenerationScopedPath = (pathname: string): string | null => {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 2 || segments[0] !== "dashboard") {
    return null;
  }

  const routeName = segments[1];
  if (!routeName || routeName === "settings" || routeName === "profile") {
    return null;
  }

  return segments.length === 2 ? "/" : `/${segments.slice(2).join("/")}`;
};

const isStatsActive = (pathname: string): boolean =>
  pathname === "/dashboard/stats" || pathname.startsWith("/dashboard/stats/");

/**
 * 내비게이션 항목을 만든다.
 *
 * 기수 안에 들어와 있으면 그 기수의 하위 메뉴로 전환하고(컨텍스트 내비게이션),
 * 밖에 있으면 접근 가능한 기수 목록을 보여준다.
 */
export const buildNavigationItems = (input: {
  pathname: string;
  generationOptions: DashboardGenerationOption[];
  selectedGeneration: DashboardGenerationOption | null;
  selectedGenerationScopedPath: string | null;
}): NavigationItem[] => {
  const { pathname, generationOptions, selectedGeneration } = input;
  const scopedPath = input.selectedGenerationScopedPath;

  const statsItem: NavigationItem = {
    key: "stats",
    href: "/dashboard/stats",
    label: "방문 통계",
    Icon: BarChart3,
    active: isStatsActive(pathname),
  };

  const homepageItem: NavigationItem = {
    key: "homepage",
    href: "/",
    label: "홈페이지",
    Icon: House,
    active: pathname === "/",
  };

  if (selectedGeneration === null) {
    return [
      ...generationOptions.map((generation) => ({
        key: `generation-${generation.id}`,
        href: generation.path,
        label: generation.name,
        Icon: FolderKanban,
        active:
          pathname === generation.path || pathname.startsWith(`${generation.path}/`),
      })),
      statsItem,
      homepageItem,
    ];
  }

  return [
    {
      key: "dashboard-home",
      href: "/dashboard",
      label: "전체 기수",
      Icon: ArrowLeft,
      active: pathname === "/dashboard",
    },
    {
      key: "generation-home",
      href: selectedGeneration.path,
      label: "기수 홈",
      Icon: FolderKanban,
      active: scopedPath === "/",
    },
    {
      key: "generation-activities",
      href: `${selectedGeneration.path}/activities`,
      label: "활동",
      Icon: ImageIcon,
      active: scopedPath?.startsWith("/activities") === true,
    },
    {
      key: "generation-exhibitions",
      href: `${selectedGeneration.path}/exhibitions`,
      label: "전시",
      Icon: Camera,
      active: scopedPath?.startsWith("/exhibitions") === true,
    },
    {
      key: "generation-members",
      href: `${selectedGeneration.path}/members`,
      label: "기수 멤버",
      Icon: Users,
      active: scopedPath?.startsWith("/members") === true,
    },
    statsItem,
    homepageItem,
  ];
};

/** 설정 섹션(프로필 포함)에 있는지. 아코디언 자동 펼침에 쓴다. */
export const isSettingsSectionPath = (pathname: string): boolean =>
  pathname === "/dashboard/profile" ||
  pathname.startsWith("/dashboard/profile/") ||
  pathname === "/dashboard/settings" ||
  pathname.startsWith("/dashboard/settings/");

/** 모바일 상단 바에 표시할 현재 페이지 이름. */
export const resolveActivePageName = (input: {
  pathname: string;
  selectedGeneration: DashboardGenerationOption | null;
  selectedGenerationScopedPath: string | null;
}): string => {
  const { pathname, selectedGeneration } = input;
  const scopedPath = input.selectedGenerationScopedPath;

  if (pathname === "/dashboard") {
    return "홈";
  }

  if (pathname.startsWith("/dashboard/profile")) {
    return "내 프로필";
  }

  if (pathname.startsWith("/dashboard/settings")) {
    return "설정";
  }

  if (selectedGeneration === null) {
    return "Dashboard";
  }

  if (scopedPath === "/") {
    const generationName = selectedGeneration.name.trim();
    return generationName.length > 0 ? generationName : "기수 홈";
  }

  if (scopedPath?.startsWith("/exhibitions")) {
    return "전시";
  }

  if (scopedPath?.startsWith("/members")) {
    return "기수 멤버";
  }

  if (scopedPath?.startsWith("/activities")) {
    return "활동";
  }

  return selectedGeneration.name;
};
