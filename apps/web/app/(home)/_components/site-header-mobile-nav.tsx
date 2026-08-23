"use client";

import Link from "next/link";
import { useMountTransition } from "@/shared/react/use-mount-transition";
import { isActivePath, navItems } from "./site-nav-items";

const mobileLinkBaseClass =
  "relative block px-4 py-4 text-center text-[0.9rem] font-medium tracking-[0.05em] text-(--text-primary) uppercase after:absolute after:bottom-[0.6rem] after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-(--text-primary) after:transition-[width] after:duration-300 hover:after:w-12";

/** 패널 퇴장 시간 — globals.css 의 `.public-mobile-nav-panel` 전환과 같아야 한다. */
const EXIT_MS = 200;

type SiteHeaderMobileNavProps = {
  isOpen: boolean;
  pathname: string;
  onClose: () => void;
};

/**
 * 모바일 메뉴 오버레이.
 *
 * 예전에는 framer-motion `AnimatePresence` 로 등장/퇴장을 만들었다. 이 헤더는 모든
 * 공개 페이지에 있어서, 그 import 하나 때문에 공개 라우트 전체가 framer-motion
 * 청크를 초기 번들로 받았다. 필요한 것은 "닫는 동안 DOM 에 남기기"뿐이라
 * `useMountTransition` + CSS 전환으로 옮겼다. 마운트/언마운트 시점과 애니메이션
 * 값(페이드 0.2s, 패널 -20px 슬라이드)은 예전과 같다.
 */
export default function SiteHeaderMobileNav({
  isOpen,
  pathname,
  onClose,
}: SiteHeaderMobileNavProps) {
  const { isMounted, state } = useMountTransition(isOpen, EXIT_MS);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-[var(--public-header-height-mobile)] bottom-0 z-[999] md:top-[var(--public-header-height-desktop)] md:hidden">
      <button
        type="button"
        className="public-mobile-nav-backdrop absolute inset-0 bg-black/25"
        aria-label="모바일 메뉴 닫기"
        data-testid="public-nav-mobile-backdrop"
        data-state={state}
        onClick={onClose}
      />
      <nav
        className="public-mobile-nav-panel absolute inset-x-0 top-0 block border-b border-(--surface-border) bg-(--surface-elevated) p-8"
        data-testid="public-nav-mobile"
        data-state={state}
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
      </nav>
    </div>
  );
}
