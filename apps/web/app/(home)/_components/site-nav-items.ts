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
  (ABOUT = 소개, ARCHIVE = 활동 기록). 데스크톱에서 부모 클릭을 "이동" 대신
  "하위 메뉴 열기/닫기"로 바꿔도 도달 못 하는 링크가 생기지 않는 이유다 —
  site-header-desktop-nav.tsx 참고. 이제 이 전제는 터치뿐 아니라 모든 클릭에
  걸리고, 부모 href 는 JS 가 없는 환경과 Ctrl/Cmd+클릭(새 탭)에서만 실제
  목적지로 쓰인다.

  ARCHIVE 를 /archive 로 바꾸고 싶어지면 주의: 그 경로는 /archive/records 로
  리다이렉트만 하는 자리라 첫 자식과의 대응이 깨진다.
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
