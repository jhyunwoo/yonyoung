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
    description: "모든 공지를 확인하고 새로 올리거나 고칠 수 있습니다.",
    href: "/dashboard/settings/notices",
  },
  {
    key: "settings-linktree",
    label: "링크 모음 관리",
    description: "홈페이지에 보여 줄 링크 목록을 정리할 수 있습니다.",
    href: "/dashboard/settings/linktree",
  },
  {
    key: "settings-site",
    label: "기본 설정",
    description: "하단 연락처와 후원 계좌 같은 사이트 기본 정보를 바꿀 수 있습니다.",
    href: "/dashboard/settings/site",
    presidentOnly: true,
  },
  {
    key: "settings-members",
    label: "전체 멤버 관리",
    description: "모든 기수 멤버 정보를 한곳에서 확인하고 수정할 수 있습니다.",
    href: "/dashboard/settings/members",
  },
  {
    key: "settings-generations",
    label: "전체 기수 관리",
    description: "기수를 만들고 고치거나 삭제하고, 멤버를 기수에 배정할 수 있습니다.",
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
