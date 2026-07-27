"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import type { NavigationItem } from "@/app/(dashboard)/_components/shell/dashboard-navigation";
import type { DashboardSettingsMenuItem } from "@/features/dashboard/settings/dashboard-settings-menu";

/** 활성/비활성 내비게이션 행의 공통 모양. */
const navRowClass = (isActive: boolean): string =>
  cx(
    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-body-sm font-medium",
    "transition-colors duration-150 motion-reduce:transition-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
    isActive
      ? "bg-primary-soft text-primary-text"
      : "text-ink-secondary hover:bg-canvas-soft hover:text-ink",
  );

type SidebarNavProps = {
  items: NavigationItem[];
  settingsItems: DashboardSettingsMenuItem[];
  pathname: string;
  isSettingsSectionActive: boolean;
  onNavigate: () => void;
};

/**
 * 사이드바 내비게이션.
 *
 * 활성 표시는 DESIGN.md 의 단일 구조 액센트(primary)를 옅게 깐 배경 + 액센트
 * 글자색으로 한다. 재디자인 이전에는 검정 채움(bg-slate-900)이라 페이지의
 * 시각 무게중심이 사이드바로 쏠렸다.
 *
 * aria-current="page" 를 붙여 현재 위치를 색이 아닌 방식으로도 알린다.
 */
export const SidebarNav = ({
  items,
  settingsItems,
  pathname,
  isSettingsSectionActive,
  onNavigate,
}: SidebarNavProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(isSettingsSectionActive);

  useEffect(() => {
    if (isSettingsSectionActive) {
      setIsSettingsExpanded(true);
    }
  }, [isSettingsSectionActive]);

  return (
    <nav aria-label="대시보드" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map(({ key, href, label, Icon, active }) => (
            <motion.li
              key={key}
              layout={!shouldReduceMotion}
              initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, x: 12, transition: { duration: 0.14 } }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 34, mass: 0.64 }
              }
            >
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={navRowClass(active)}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>

        <motion.li layout={!shouldReduceMotion}>
          <button
            type="button"
            data-testid="dashboard-settings-toggle"
            onClick={() => setIsSettingsExpanded((previous) => !previous)}
            aria-expanded={isSettingsExpanded}
            className={cx(navRowClass(isSettingsSectionActive), "text-left")}
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">설정</span>
            <ChevronDown
              aria-hidden="true"
              className={cx(
                "h-4 w-4 transition-transform duration-150 motion-reduce:transition-none",
                isSettingsExpanded && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {isSettingsExpanded && (
              <motion.ul
                initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={
                  shouldReduceMotion
                    ? { height: 0, opacity: 0 }
                    : { height: 0, opacity: 0, transition: { duration: 0.16 } }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 460, damping: 36, mass: 0.58 }
                }
                className="mt-1 space-y-1 overflow-hidden pl-7"
              >
                {settingsItems.map((item, index) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <motion.li
                      key={item.key}
                      initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, x: 8, transition: { duration: 0.12 } }
                      }
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.2, delay: index * 0.03, ease: "easeOut" }
                      }
                    >
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cx(
                          "flex min-h-10 items-center rounded-md px-3 py-2 text-body-sm",
                          "transition-colors duration-150 motion-reduce:transition-none",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                          isActive
                            ? "bg-canvas-soft font-semibold text-ink"
                            : "text-ink-muted hover:bg-canvas-soft hover:text-ink",
                        )}
                      >
                        {item.label}
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.li>
      </ul>
    </nav>
  );
};
