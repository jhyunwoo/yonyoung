import type { ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "border-hairline bg-canvas-soft text-ink-secondary",
  primary: "border-primary-hairline bg-primary-soft text-primary-text",
  success: "border-success-hairline bg-success-soft text-success-text",
  warning: "border-warning-hairline bg-warning-soft text-warning-text",
  danger: "border-danger-hairline bg-danger-soft text-danger-text",
};

/**
 * 상태 · 카테고리 라벨. DESIGN.md 의 badge-pill(12px/600, rounded-full).
 * 색만으로 의미를 전달하지 않도록 항상 텍스트를 함께 담는다.
 */
export const Badge = ({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-eyebrow",
      TONE_CLASS[tone],
      className,
    )}
  >
    {icon !== undefined && (
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    )}
    {children}
  </span>
);
