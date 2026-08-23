"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import SiteHeaderDesktopNav from "./site-header-desktop-nav";
import SiteHeaderMobileNav from "./site-header-mobile-nav";
import SiteHeaderThemeSwitcher from "./site-header-theme-switcher";
import { useBodyScrollLock } from "./hooks/use-body-scroll-lock";

/**
 * 헤더에서 실제로 상호작용이 필요한 부분만 모은 아일랜드.
 *
 * 예전에는 헤더 파일 전체가 `"use client"` 였다. 로고와 헤더 프레임처럼 영원히
 * 정적인 마크업까지 클라이언트 번들과 하이드레이션 대상에 들어갔다는 뜻이다.
 * 지금은 `SiteHeader`(서버 컴포넌트)가 프레임을 그리고, 경로 의존 상태(활성 메뉴)와
 * 모바일 메뉴 개폐만 여기서 다룬다.
 */
export default function SiteHeaderNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  // 다른 페이지로 이동하면 열려 있던 모바일 메뉴를 닫는다.
  // effect로 나중에 닫으면 새 화면이 메뉴가 열린 채로 한 프레임 그려진다.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  useBodyScrollLock(isMobileMenuOpen);

  return (
    <>
      <nav className="hidden items-center gap-3 md:flex" data-testid="public-nav-desktop">
        <SiteHeaderDesktopNav pathname={pathname} />
        <SiteHeaderThemeSwitcher />
      </nav>

      <button
        type="button"
        className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded p-0 md:hidden"
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        aria-label="모바일 메뉴 토글"
        aria-expanded={isMobileMenuOpen}
        data-testid="public-nav-toggle"
      >
        <span
          className={`h-[2px] w-[25px] bg-(--text-primary) transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
            isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
          }`}
        />
        <span
          className={`h-[2px] w-[25px] bg-(--text-primary) transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
            isMobileMenuOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`h-[2px] w-[25px] bg-(--text-primary) transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
            isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
          }`}
        />
      </button>

      <SiteHeaderMobileNav
        isOpen={isMobileMenuOpen}
        pathname={pathname}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
