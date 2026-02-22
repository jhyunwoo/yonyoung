"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type AdminActionButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type AdminActionButtonSize = "sm" | "md";

const joinClasses = (...classNames: Array<string | false | null | undefined>): string =>
  classNames.filter(Boolean).join(" ");

type AdminActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  variant?: AdminActionButtonVariant;
  size?: AdminActionButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
  loadingText?: ReactNode;
  children: ReactNode;
  testId?: string;
};

const VARIANT_CLASS_MAP: Record<AdminActionButtonVariant, string> = {
  primary:
    "border-[var(--admin-accent-strong)] bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)] shadow-sm hover:bg-[var(--admin-accent-hover)] disabled:border-[var(--admin-border-strong)] disabled:bg-[var(--admin-border-strong)] disabled:text-[var(--admin-text-muted)]",
  secondary:
    "border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm hover:bg-[var(--admin-surface-muted)] disabled:border-[var(--admin-border)] disabled:bg-[var(--admin-surface-muted)] disabled:text-[var(--admin-text-muted)]",
  danger:
    "border-[var(--admin-status-danger-border)] bg-[var(--admin-status-danger-bg)] text-[var(--admin-status-danger-text)] shadow-sm hover:bg-[var(--admin-status-danger-hover)] disabled:border-[var(--admin-border)] disabled:bg-[var(--admin-surface-muted)] disabled:text-[var(--admin-text-muted)]",
  ghost:
    "border-[var(--admin-border)] bg-transparent text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] disabled:text-[var(--admin-text-muted)]",
};

const SIZE_CLASS_MAP: Record<AdminActionButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3.5 text-sm",
};

export default function AdminActionButton({
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  iconOnly = false,
  loading = false,
  disabled = false,
  loadingText,
  children,
  onClick,
  className,
  testId,
  ...rest
}: AdminActionButtonProps) {
  const resolvedDisabled = disabled || loading;
  const resolvedText = loading && loadingText ? loadingText : children;
  const {
    ["data-testid"]: passthroughTestId,
    ...buttonProps
  } = rest as ButtonHTMLAttributes<HTMLButtonElement> & { "data-testid"?: string };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={resolvedDisabled}
      {...buttonProps}
      className={joinClasses(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium tracking-[0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
        SIZE_CLASS_MAP[size],
        fullWidth && "w-full",
        iconOnly && "w-10 px-0",
        VARIANT_CLASS_MAP[variant],
        className,
      )}
      data-testid={testId ?? passthroughTestId}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className={joinClasses(
            "animate-spin rounded-full border-2 border-current border-t-transparent",
            size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
          )}
        />
      ) : null}
      {iconOnly ? <span className="sr-only">{resolvedText}</span> : <span>{resolvedText}</span>}
    </button>
  );
}
