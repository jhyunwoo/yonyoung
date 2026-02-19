"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavChild = {
  href: string;
  label: string;
};

type NavItem = {
  href: string;
  label: string;
  testId: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
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
    href: "/archive",
    label: "ARCHIVE",
    testId: "archive",
    children: [
      { href: "/archive/records", label: "활동 기록" },
      { href: "/archive/supporters", label: "서포터즈" },
      { href: "/archive/exhibitions", label: "전시회" },
    ],
  },
  { href: "/linktree", label: "LINKTREE", testId: "linktree" },
  { href: "/donate", label: "DONATE US", testId: "donate" },
];

const isActivePath = (pathname: string, item: NavItem): boolean => {
  if (item.href === "/about") {
    return pathname.startsWith("/about");
  }
  if (item.href === "/archive") {
    return pathname.startsWith("/archive");
  }
  return pathname === item.href;
};

const desktopLinkBaseClass =
  "relative block py-6 text-[0.9rem] font-medium tracking-[0.05em] text-[#2c3357] uppercase after:absolute after:bottom-[0.8rem] after:left-0 after:h-[2px] after:w-0 after:bg-[#2c3357] after:transition-[width] after:duration-300 hover:after:w-full";

const mobileLinkBaseClass =
  "relative block px-4 py-4 text-center text-[0.9rem] font-medium tracking-[0.05em] text-[#2c3357] uppercase after:absolute after:bottom-[0.6rem] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-[#2c3357] after:transition-[width] after:duration-300 hover:after:w-12";

export default function SiteHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-[1000] border-b border-transparent bg-white backdrop-blur-[10px] transition-all duration-300",
        isScrolled
          ? "border-b-[#bfbfbf] shadow-[0_2px_10px_rgba(44,51,87,0.1)]"
          : "",
      ]
        .join(" ")
        .trim()}
      data-testid="public-header"
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-[0.6rem]"
            data-testid="public-logo-link"
          >
            <div className="flex h-[1.92rem] items-center justify-center">
              <Image
                src="/yonyoung-logo-black.png"
                alt="연영회 로고"
                width={40}
                height={40}
                priority
                unoptimized
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-[#2c3357]">
              <span className="block tracking-[-0.05em]">연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </Link>
        </div>

        <nav className="hidden md:block" data-testid="public-nav-desktop">
          <ul className="flex list-none items-center gap-8">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li
                  key={item.href}
                  className={item.children ? "relative group" : "relative"}
                >
                  <Link
                    href={item.href}
                    className={`${desktopLinkBaseClass} ${active ? "after:w-full" : ""}`.trim()}
                    data-testid={`public-nav-desktop-${item.testId}`}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className="invisible absolute top-full left-1/2 z-20 min-w-[150px] -translate-x-1/2 border-t-2 border-[#2c3357] bg-white py-2 opacity-0 shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:visible group-hover:opacity-100">
                      {item.children.map((child) => (
                        <li key={child.href} className="w-full">
                          <Link
                            href={child.href}
                            className="block whitespace-nowrap px-6 py-[0.8rem] text-[0.85rem] text-[#2c3357] transition-colors duration-200 hover:bg-[#f5f5f5]"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="flex flex-col gap-[5px] rounded p-2 md:hidden"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="모바일 메뉴 토글"
          aria-expanded={isMobileMenuOpen}
          data-testid="public-nav-toggle"
        >
          <span className="h-[2px] w-[25px] bg-[#2c3357] transition-all duration-300" />
          <span className="h-[2px] w-[25px] bg-[#2c3357] transition-all duration-300" />
          <span className="h-[2px] w-[25px] bg-[#2c3357] transition-all duration-300" />
        </button>
      </div>

      {isMobileMenuOpen ? (
        <nav
          className="fixed inset-x-0 top-[70px] block border-b border-[#bfbfbf] bg-[rgba(255,255,255,0.98)] p-8 backdrop-blur-[10px] md:hidden"
          data-testid="public-nav-mobile"
        >
          <ul className="flex list-none flex-col gap-4">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li key={item.href} className="w-full">
                  <Link
                    href={item.href}
                    className={`${mobileLinkBaseClass} ${active ? "after:w-12" : ""}`.trim()}
                    data-testid={`public-nav-mobile-${item.testId}`}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className="mt-[0.4rem] w-full list-none bg-[rgba(0,0,0,0.03)]">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block px-4 py-[0.8rem] text-center text-[0.8rem] text-[#2c3357]"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
