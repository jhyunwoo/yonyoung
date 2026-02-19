"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./site-header.module.css";

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
      className={[styles.navigation, isScrolled ? styles.scrolled : ""]
        .join(" ")
        .trim()}
      data-testid="public-header"
    >
      <div className={styles.navContainer}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.logo} data-testid="public-logo-link">
            <div className={styles.logoImage}>
              <Image
                src="/yonyoung-logo-black.png"
                alt="연영회 로고"
                width={40}
                height={40}
                priority
                unoptimized
              />
            </div>
            <div className={styles.logoText}>
              <span>연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </Link>
        </div>

        <nav className={styles.desktopNav} data-testid="public-nav-desktop">
          <ul className={styles.navMenu}>
            {navItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li
                  key={item.href}
                  className={item.children ? styles.hasDropdown : undefined}
                >
                  <Link
                    href={item.href}
                    className={active ? styles.activeLink : undefined}
                    data-testid={`public-nav-desktop-${item.testId}`}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className={styles.dropdown}>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href}>{child.label}</Link>
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
          className={styles.mobileMenuToggle}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="모바일 메뉴 토글"
          aria-expanded={isMobileMenuOpen}
          data-testid="public-nav-toggle"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {isMobileMenuOpen ? (
        <nav className={styles.mobileNav} data-testid="public-nav-mobile">
          <ul className={styles.mobileMenuList}>
            {navItems.map((item) => {
              const active = isActivePath(pathname, item);
              return (
                <li
                  key={item.href}
                  className={item.children ? styles.hasDropdown : undefined}
                >
                  <Link
                    href={item.href}
                    className={active ? styles.activeLink : undefined}
                    data-testid={`public-nav-mobile-${item.testId}`}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <ul className={styles.dropdownMobile}>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href}>{child.label}</Link>
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
