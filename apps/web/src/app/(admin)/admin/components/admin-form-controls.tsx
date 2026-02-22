import Link from "next/link";
import type {
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const joinClasses = (...classNames: Array<string | false | null | undefined>): string =>
  classNames.filter(Boolean).join(" ");

const CONTROL_BASE_CLASS =
  "w-full rounded-lg border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] px-3 text-sm text-[var(--admin-text-primary)] shadow-sm transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-[var(--admin-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)] disabled:cursor-not-allowed disabled:border-[var(--admin-border)] disabled:bg-[var(--admin-surface-muted)] disabled:text-[var(--admin-text-muted)]";

type AdminTextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AdminTextInput({ className, ...props }: AdminTextInputProps) {
  return <input className={joinClasses(CONTROL_BASE_CLASS, "h-10", className)} {...props} />;
}

type AdminSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function AdminSelect({ className, children, ...props }: AdminSelectProps) {
  return (
    <select className={joinClasses(CONTROL_BASE_CLASS, "h-10 pr-9", className)} {...props}>
      {children}
    </select>
  );
}

type AdminTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AdminTextarea({ className, ...props }: AdminTextareaProps) {
  return (
    <textarea className={joinClasses(CONTROL_BASE_CLASS, "min-h-24 py-2.5", className)} {...props} />
  );
}

type AdminStatusMessageTone = "error" | "success" | "warning" | "info";

type AdminStatusMessageProps = {
  tone?: AdminStatusMessageTone;
  children: ReactNode;
  className?: string;
  testId?: string;
  role?: "status" | "alert";
};

const STATUS_CLASS_MAP: Record<AdminStatusMessageTone, string> = {
  error:
    "border-[var(--admin-status-danger-border)] bg-[var(--admin-status-danger-bg)] text-[var(--admin-status-danger-text)]",
  success:
    "border-[var(--admin-status-success-border)] bg-[var(--admin-status-success-bg)] text-[var(--admin-status-success-text)]",
  warning:
    "border-[var(--admin-status-warning-border)] bg-[var(--admin-status-warning-bg)] text-[var(--admin-status-warning-text)]",
  info: "border-[var(--admin-status-info-border)] bg-[var(--admin-status-info-bg)] text-[var(--admin-status-info-text)]",
};

export function AdminStatusMessage({
  tone = "info",
  children,
  className,
  testId,
  role,
}: AdminStatusMessageProps) {
  return (
    <p
      role={role ?? (tone === "error" ? "alert" : "status")}
      className={joinClasses(
        "rounded-lg border px-3 py-2 text-sm",
        STATUS_CLASS_MAP[tone],
        className,
      )}
      data-testid={testId}
    >
      {children}
    </p>
  );
}

type AdminLinkButtonVariant = "primary" | "secondary" | "ghost";
type AdminLinkButtonSize = "sm" | "md";

type AdminLinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  variant?: AdminLinkButtonVariant;
  size?: AdminLinkButtonSize;
  fullWidth?: boolean;
};

const LINK_VARIANT_CLASS_MAP: Record<AdminLinkButtonVariant, string> = {
  primary:
    "border-[var(--admin-accent-strong)] bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)] shadow-sm hover:bg-[var(--admin-accent-hover)]",
  secondary:
    "border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm hover:bg-[var(--admin-surface-muted)]",
  ghost:
    "border-[var(--admin-border)] bg-transparent text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)]",
};

const LINK_SIZE_CLASS_MAP: Record<AdminLinkButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-3.5 text-sm",
};

export function AdminLinkButton({
  children,
  className,
  variant = "secondary",
  size = "md",
  fullWidth = false,
  ...props
}: AdminLinkButtonProps) {
  return (
    <Link
      {...props}
      className={joinClasses(
        "inline-flex items-center justify-center rounded-lg border font-medium tracking-[0.01em] transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)]",
        LINK_VARIANT_CLASS_MAP[variant],
        LINK_SIZE_CLASS_MAP[size],
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </Link>
  );
}
