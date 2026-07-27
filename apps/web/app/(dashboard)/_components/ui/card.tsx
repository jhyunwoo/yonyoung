import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  /** DESIGN.md 레벨 1 — barely-there 다층 그림자. 기본은 hairline 만(레벨 0). */
  elevated?: boolean;
  /** 캔버스보다 한 단계 눌린 내부 타일용. */
  tone?: "surface" | "sunken";
  padding?: "none" | "sm" | "md" | "lg";
};

const PADDING_CLASS = {
  none: "",
  sm: "p-4",
  md: "p-4 md:p-6",
  lg: "p-5 md:p-8",
} as const;

/**
 * 대시보드의 기본 표면. DESIGN.md 의 elevation 철학대로 기본은 그림자 없이
 * hairline 테두리만 쓰고, 떠 있어야 하는 것에만 elevated 를 켠다.
 */
export const Card = ({
  as,
  elevated = false,
  tone = "surface",
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) => {
  const Component = as ?? "section";

  return (
    <Component
      className={cx(
        "rounded-lg border border-hairline",
        tone === "surface" ? "bg-surface" : "bg-surface-sunken",
        elevated && "shadow-soft",
        PADDING_CLASS[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
};

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** 헤딩 레벨. 페이지의 h1 은 PageHeader 가 담당하므로 기본은 h2. */
  headingLevel?: 2 | 3;
  className?: string;
};

export const CardHeader = ({
  title,
  description,
  actions,
  headingLevel = 2,
  className,
}: CardHeaderProps) => {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading
          className={cx(
            "text-ink",
            headingLevel === 2 ? "text-title" : "text-body font-semibold",
          )}
        >
          {title}
        </Heading>
        {description !== undefined && (
          <p className="mt-1.5 text-caption text-ink-muted">{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
};

export const CardBody = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => <div className={cx("text-body-sm text-ink-secondary", className)}>{children}</div>;

export const CardFooter = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cx(
      "mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4",
      className,
    )}
  >
    {children}
  </div>
);
