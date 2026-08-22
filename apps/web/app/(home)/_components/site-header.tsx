"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SiteHeaderDesktopNav from "./site-header-desktop-nav";
import SiteHeaderMobileNav from "./site-header-mobile-nav";
import SiteHeaderThemeSwitcher from "./site-header-theme-switcher";
import { useBodyScrollLock } from "./hooks/use-body-scroll-lock";
import { useHeaderScrollState } from "./hooks/use-header-scroll-state";
import { useThemeMode } from "./hooks/use-theme-mode";

export default function SiteHeader() {
  const pathname = usePathname();
  const isScrolled = useHeaderScrollState();
  const { themeMode, resolvedTheme, changeThemeMode } = useThemeMode();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  // 다른 페이지로 이동하면 열려 있던 모바일 메뉴를 닫는다.
  // effect로 나중에 닫으면 새 화면이 메뉴가 열린 채로 한 프레임 그려진다.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setIsMobileMenuOpen(false);
  }

  useBodyScrollLock(isMobileMenuOpen);

  const logoSrc =
    resolvedTheme === "dark" ? "/yonyong-logo-white.png" : "/yonyoung-logo-black.png";

  return (
    <header
      className={[
        // 스크롤 시 실제로 바뀌는 것은 테두리와 그림자뿐이다. transition-all 이면
        // 배경색까지 전환 대상이 돼, 테마를 바꿀 때 페이지 전체는 즉시 바뀌는데
        // 헤더만 300ms 동안 뒤늦게 따라오는 것이 눈에 띈다.
        "fixed inset-x-0 top-0 z-[1000] h-[var(--public-header-height-mobile)] border-b border-transparent bg-(--surface-elevated) transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none md:h-[var(--public-header-height-desktop)]",
        isScrolled
          ? "border-b-(--surface-border) shadow-[0_2px_10px_var(--shadow-strong)]"
          : "",
      ]
        .join(" ")
        .trim()}
      data-testid="public-header"
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-[0.6rem]"
            data-testid="public-logo-link"
          >
            <div className="flex h-[1.92rem] items-center justify-center">
              <Image
                key={logoSrc}
                src={logoSrc}
                alt="연영회 로고"
                width={40}
                height={40}
                priority
                className="h-full w-auto object-contain"
                data-testid="public-logo-image"
              />
            </div>
            <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-(--text-primary)">
              <span className="block tracking-[-0.05em]">연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </Link>
        </div>

        <nav
          className="hidden items-center gap-3 md:flex"
          data-testid="public-nav-desktop"
        >
          <SiteHeaderDesktopNav pathname={pathname} />
          <SiteHeaderThemeSwitcher themeMode={themeMode} onChange={changeThemeMode} />
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
      </div>

      <SiteHeaderMobileNav
        isOpen={isMobileMenuOpen}
        pathname={pathname}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </header>
  );
}
