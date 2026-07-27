"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cx } from "@/app/(dashboard)/_components/ui/cx";
import { IconButton } from "@/app/(dashboard)/_components/ui/icon-button";
import { useFocusTrap } from "@/app/(dashboard)/_components/ui/use-focus-trap";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** 배경 클릭으로 닫기. 저장되지 않은 입력이 있는 다이얼로그는 false 로. */
  dismissOnBackdrop?: boolean;
  testId?: string;
  children?: ReactNode;
};

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/**
 * 모달 다이얼로그.
 *
 * DESIGN.md 레벨 2(elevated) 표면을 쓰고, 배경은 scrim 으로 눌러 전경을
 * 분리한다. 포커스 트랩 · Esc · 스크롤 잠금 · 포커스 복귀는 useFocusTrap 담당.
 */
export const Dialog = ({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  dismissOnBackdrop = true,
  testId,
  children,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;

  // 포털은 클라이언트에서만 마운트한다.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useFocusTrap(panelRef, open && isMounted);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !isMounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      data-testid={testId ?? "ui-dialog"}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim"
        onClick={dismissOnBackdrop ? onClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description !== undefined ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden",
          "rounded-t-xl border border-hairline bg-surface-raised shadow-elevated",
          "pb-[env(safe-area-inset-bottom)] sm:rounded-xl sm:pb-0",
          SIZE_CLASS[size],
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title text-ink">
              {title}
            </h2>
            {description !== undefined && (
              <div id={descriptionId} className="mt-1.5 text-body-sm text-ink-muted">
                {description}
              </div>
            )}
          </div>
          <IconButton
            data-testid="ui-dialog-close"
            label="닫기"
            icon={<X className="h-4 w-4" />}
            onClick={onClose}
          />
        </div>

        {children !== undefined && (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        )}

        {footer !== undefined && (
          <div className="flex flex-col-reverse gap-2 border-t border-hairline px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
