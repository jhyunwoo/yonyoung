"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ThemeToggle from "./theme-toggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/archive", label: "Archive" },
  { href: "/linktree", label: "Linktree" },
  { href: "/donate", label: "Donate" },
];

/**
 * SiteHeader 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClassName = useMemo(
    () =>
      [
        "sticky top-0 z-50 border-b transition-all",
        isScrolled
          ? "border-[var(--surface-border)] bg-[color:var(--surface-elevated)]/95 backdrop-blur-xl"
          : "border-transparent bg-[color:var(--surface-elevated)]/70 backdrop-blur-md",
      ].join(" "),
    [isScrolled],
  );

  return (
    <header className={headerClassName} data-testid="public-header">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:h-18 md:px-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-3"
          data-testid="public-logo-link"
        >
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] text-sm font-semibold text-[var(--text-primary)]">
            Y
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Yonsei Photo Club
            </p>
            <p className="font-display text-xl text-[var(--text-primary)]">연영회</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" data-testid="public-nav-desktop">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`public-nav-desktop-${item.label.toLowerCase()}`}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
            aria-label="모바일 메뉴 토글"
            aria-expanded={isMenuOpen}
            data-testid="public-nav-toggle"
          >
            {isMenuOpen ? "×" : "☰"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--surface-border)] bg-[var(--surface-elevated)] px-4 py-4 md:hidden"
            data-testid="public-nav-mobile"
          >
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-testid={`public-nav-mobile-${item.label.toLowerCase()}`}
                      className={[
                        "block rounded-xl px-4 py-3 text-sm transition",
                        isActive
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
