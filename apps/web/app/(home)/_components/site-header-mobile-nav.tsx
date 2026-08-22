"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isActivePath, navItems } from "./site-nav-items";

const mobileLinkBaseClass =
  "relative block px-4 py-4 text-center text-[0.9rem] font-medium tracking-[0.05em] text-(--text-primary) uppercase after:absolute after:bottom-[0.6rem] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-(--text-primary) after:transition-[width] after:duration-300 hover:after:w-12";

type SiteHeaderMobileNavProps = {
  isOpen: boolean;
  pathname: string;
  onClose: () => void;
};

export default function SiteHeaderMobileNav({
  isOpen,
  pathname,
  onClose,
}: SiteHeaderMobileNavProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <div className="fixed inset-x-0 top-[var(--public-header-height-mobile)] bottom-0 z-[999] md:top-[var(--public-header-height-desktop)] md:hidden">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label="모바일 메뉴 닫기"
            data-testid="public-nav-mobile-backdrop"
            onClick={onClose}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }
            }
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          />
          <motion.nav
            className="absolute inset-x-0 top-0 block border-b border-(--surface-border) bg-(--surface-elevated) p-8"
            data-testid="public-nav-mobile"
            data-state="open"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0, y: -8 }
                : { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeOut" } }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 360, damping: 30, mass: 0.62 }
            }
          >
            <ul className="flex list-none flex-col gap-4">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <li key={item.href} className="w-full">
                    <Link
                      href={item.href}
                      prefetch={item.prefetch}
                      rel={item.rel}
                      className={`${mobileLinkBaseClass} ${active ? "after:w-12" : ""}`.trim()}
                      data-testid={`public-nav-mobile-${item.testId}`}
                      onClick={onClose}
                    >
                      {item.label}
                    </Link>
                    {item.children ? (
                      <ul className="mt-[0.4rem] w-full list-none bg-(--surface-muted)">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block px-4 py-[0.8rem] text-center text-[0.8rem] text-(--text-primary)"
                              onClick={onClose}
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
          </motion.nav>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
