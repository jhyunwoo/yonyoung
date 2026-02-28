type DashboardSettingsMenuItem = {
  key: string;
  label: string;
  description: string;
  href: string;
  presidentOnly?: boolean;
};

const SETTINGS_MENU_ITEMS: DashboardSettingsMenuItem[] = [
  {
    key: "settings-notices",
    label: "전체 공지 관리",
    description: "전체 공지를 작성하고 수정합니다.",
    href: "/dashboard/settings/notices",
  },
  {
    key: "settings-linktree",
    label: "Linktree 관리",
    description: "링크트리 항목을 관리합니다.",
    href: "/dashboard/settings/linktree",
  },
  {
    key: "settings-members",
    label: "전체 멤버 관리",
    description: "모든 기수의 멤버를 통합 관리합니다.",
    href: "/dashboard/settings/members",
  },
  {
    key: "settings-generations",
    label: "전체 기수 관리",
    description: "전체 기수의 생성, 수정, 삭제와 멤버 배정을 관리합니다.",
    href: "/dashboard/settings/generations",
    presidentOnly: true,
  },
];

export const buildDashboardSettingsMenuItems = (input: {
  isPresident: boolean;
}): DashboardSettingsMenuItem[] =>
  SETTINGS_MENU_ITEMS.filter((item) => {
    if (item.presidentOnly && !input.isPresident) {
      return false;
    }
    return true;
  });
