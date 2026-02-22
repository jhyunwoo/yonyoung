"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AdminActionButton from "./admin-action-button";

type AdminDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  variant?: "overlay" | "page";
  showCloseButton?: boolean;
};

export default function AdminDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  testId = "admin-drawer",
  variant = "overlay",
  showCloseButton = true,
}: AdminDrawerProps) {
  useEffect(() => {
    if (variant === "page" || !open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, variant]);

  if (variant === "page") {
    if (!open) {
      return null;
    }

    return (
      <section
        role="region"
        aria-label={title}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_16px_30px_-24px_rgba(0,0,0,0.55)]"
        data-testid={testId}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 md:px-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <AdminActionButton
              variant="secondary"
              size="sm"
              onClick={onClose}
              data-testid={`${testId}-close`}
            >
              닫기
            </AdminActionButton>
          ) : null}
        </header>

        <div className="px-5 py-5 md:px-6">{children}</div>

        {footer ? (
          <footer className="border-t border-gray-200 bg-white px-5 py-3 md:px-6">{footer}</footer>
        ) : null}
      </section>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="drawer-backdrop"
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
          data-testid={`${testId}-backdrop`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.section
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="flex h-full w-full max-w-3xl flex-col border-l border-gray-200 bg-white shadow-[0_14px_36px_-22px_rgba(0,0,0,0.65)] xl:max-w-4xl"
            onClick={(event) => event.stopPropagation()}
            data-testid={testId}
            initial={{ x: 56, opacity: 0.98 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 md:px-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {description ? (
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
                ) : null}
              </div>
              {showCloseButton ? (
                <AdminActionButton
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  data-testid={`${testId}-close`}
                >
                  닫기
                </AdminActionButton>
              ) : null}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>

            {footer ? (
              <footer className="border-t border-gray-200 bg-white px-5 py-3 md:px-6">
                {footer}
              </footer>
            ) : null}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
