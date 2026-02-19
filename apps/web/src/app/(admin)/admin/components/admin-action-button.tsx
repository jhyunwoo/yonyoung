"use client";

type AdminActionButtonVariant = "primary" | "danger" | "ghost";

type AdminActionButtonProps = {
  type?: "button" | "submit";
  variant?: AdminActionButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  loadingText?: string;
  children: string;
  onClick?: () => void;
  className?: string;
  testId?: string;
};

const VARIANT_CLASS_MAP: Record<AdminActionButtonVariant, string> = {
  primary:
    "border border-black bg-black text-white hover:opacity-90 disabled:border-gray-300 disabled:bg-gray-300",
  danger:
    "border border-red-300 bg-white text-red-600 hover:bg-red-50 disabled:bg-red-50 disabled:text-red-300",
  ghost:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400",
};

export default function AdminActionButton({
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  loadingText,
  children,
  onClick,
  className,
  testId,
}: AdminActionButtonProps) {
  const resolvedDisabled = disabled || loading;
  const resolvedText = loading && loadingText ? loadingText : children;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={resolvedDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASS_MAP[variant]} ${className ?? ""}`}
      data-testid={testId}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      <span>{resolvedText}</span>
    </button>
  );
}
