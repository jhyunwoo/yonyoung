"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import { IconButton } from "@/app/(dashboard)/_components/ui/icon-button";
import { useFocusTrap } from "@/app/(dashboard)/_components/ui/use-focus-trap";

type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

/**
 * 모바일 사이드바 드로어.
 *
 * 재디자인 이전에는 role="dialog" aria-modal="true" 를 달고도 포커스 트랩이
 * 없어서 키보드 사용자가 배경 콘텐츠로 그냥 탭해 나갔고, 닫은 뒤 포커스가
 * 문서 처음으로 돌아갔다. useFocusTrap 이 트랩 · 스크롤 잠금 · 포커스 복귀를
 * 모두 처리한다.
 */
export const MobileDrawer = ({ open, onClose, children }: MobileDrawerProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          data-testid="dashboard-mobile-sidebar"
          data-state="open"
        >
          <motion.button
            type="button"
            data-testid="dashboard-mobile-sidebar-backdrop"
            aria-label="사이드바 닫기"
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="대시보드 메뉴"
            tabIndex={-1}
            className={cx(
              "absolute inset-y-0 right-0 flex w-[84%] max-w-sm flex-col",
              "border-l border-hairline bg-surface shadow-elevated",
              "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            )}
            initial={shouldReduceMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{
              x: "100%",
              transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
            }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 330, damping: 32, mass: 0.7 }
            }
          >
            <div className="flex items-center justify-end border-b border-hairline px-3 py-2">
              <IconButton
                data-testid="dashboard-mobile-sidebar-close"
                label="사이드바 닫기"
                icon={<X className="h-4 w-4" />}
                onClick={onClose}
              />
            </div>

            <div className="min-h-0 flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
