export type NavChild = {
  href: string;
  label: string;
};

export type NavItem = {
  href: string;
  label: string;
  testId: string;
  children?: NavChild[];
  prefetch?: boolean;
  rel?: "nofollow";
};

/*
  children 이 있는 항목은 부모 href 가 첫 번째 자식과 같은 곳을 가리킨다
  (ABOUT = 소개, ARCHIVE = 활동 기록). 터치에서 부모 탭을 "이동" 대신
  "하위 메뉴 열기"로 바꿔도 도달 못 하는 링크가 생기지 않는 이유다 —
  site-header-desktop-nav.tsx 참고. 이 대응 관계를 깨려면 그쪽도 같이 봐야 한다.
*/
export const navItems: NavItem[] = [
  {
    href: "/about",
    label: "ABOUT",
    testId: "about",
    children: [
      { href: "/about", label: "소개" },
      { href: "/about/photographers", label: "PHOTOGRAPHERS" },
      { href: "/about/recruiting", label: "RECRUITING" },
    ],
  },
  {
    href: "/archive/records",
    label: "ARCHIVE",
    testId: "archive",
    children: [
      { href: "/archive/records", label: "활동 기록" },
      { href: "/archive/exhibitions", label: "전시회" },
    ],
  },
  { href: "/linktree", label: "LINKTREE", testId: "linktree" },
  { href: "/donate", label: "DONATE US", testId: "donate" },
  {
    href: "/dashboard",
    label: "DASHBOARD",
    testId: "dashboard",
    rel: "nofollow",
  },
];

export const isActivePath = (pathname: string, item: NavItem): boolean => {
  if (item.href === "/about") {
    return pathname.startsWith("/about");
  }
  if (item.href === "/archive/records") {
    return pathname.startsWith("/archive");
  }
  return pathname === item.href;
};
