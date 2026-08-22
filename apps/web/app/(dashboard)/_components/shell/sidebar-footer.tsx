"use client";

import { useResetOnChange } from "@/shared/react/use-reset-on-change";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LogOut, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/app/(dashboard)/_components/ui/avatar";
import { cx } from "@/app/(dashboard)/_components/ui/cx";
import { ThemeToggle } from "@/app/(dashboard)/_components/ui/theme-toggle";
import type { DashboardViewer } from "@/app/(dashboard)/_components/shell/dashboard-shell-types";

type SidebarFooterProps = {
  viewer: DashboardViewer | null;
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => Promise<void>;
  isSignOutPending: boolean;
};

const menuItemClass = cx(
  "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-body-sm font-medium text-ink-secondary",
  "transition-colors duration-150 motion-reduce:transition-none",
  "hover:bg-canvas-soft hover:text-ink",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring)",
  "disabled:cursor-not-allowed disabled:text-ink-muted",
);

/** 사이드바 하단: 테마 전환 + 프로필 메뉴(개인 프로필 / 로그아웃). */
export const SidebarFooter = ({
  viewer,
  pathname,
  onNavigate,
  onSignOut,
  isSignOutPending,
}: SidebarFooterProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // 경로가 바뀌면 메뉴를 닫는다.
  useResetOnChange(pathname, () => setIsMenuOpen(false));

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleMouseDown = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target) === true) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const viewerName = viewer?.displayName ?? "사용자";
  const viewerEmail = viewer?.email ?? "";

  return (
    <div className="flex flex-col gap-3 border-t border-hairline p-3">
      <ThemeToggle />

      <div className="relative" ref={menuRef}>
        <AnimatePresence initial={false}>
          {isMenuOpen && (
            <motion.div
              role="menu"
              aria-label="계정 메뉴"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, transition: { duration: 0.14 } }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 34, mass: 0.64 }
              }
              className={cx(
                "absolute right-0 bottom-full left-0 mb-2 overflow-hidden",
                "rounded-md border border-hairline bg-surface-raised shadow-elevated",
              )}
            >
              <Link
                href="/dashboard/profile"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate();
                }}
                className={menuItemClass}
              >
                <UserCircle2 className="h-4 w-4" aria-hidden="true" />
                개인 프로필
              </Link>
              <button
                type="button"
                role="menuitem"
                data-testid="dashboard-signout-button"
                disabled={isSignOutPending}
                onClick={() => {
                  setIsMenuOpen(false);
                  void onSignOut();
                }}
                className={menuItemClass}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isSignOutPending ? "로그아웃 중..." : "로그아웃"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          data-testid="dashboard-profile-menu-toggle"
          onClick={() => setIsMenuOpen((previous) => !previous)}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className={cx(
            "flex min-h-11 w-full items-center gap-3 rounded-md border border-hairline px-3 py-2 text-left",
            "transition-colors duration-150 motion-reduce:transition-none",
            "hover:bg-canvas-soft",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
          )}
        >
          <Avatar name={viewerName} src={viewer?.image} size="sm" />

          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-semibold text-ink">
              {viewerName}
            </span>
            {viewerEmail !== "" && (
              <span className="block truncate text-caption text-ink-muted">
                {viewerEmail}
              </span>
            )}
          </span>

          <ChevronDown
            aria-hidden="true"
            className={cx(
              "h-4 w-4 shrink-0 text-ink-muted",
              "transition-transform duration-150 motion-reduce:transition-none",
              isMenuOpen && "rotate-180",
            )}
          />
        </button>
      </div>
    </div>
  );
};
