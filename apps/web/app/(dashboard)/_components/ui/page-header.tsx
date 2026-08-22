import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

type PageHeaderProps = {
  /** 12px 대문자 라벨. 계층을 말해주는 값일 때만 쓴다(장식 금지). */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** 우측 액션. 화면당 primary 버튼은 하나만. */
  actions?: ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

/**
 * 페이지 헤더.
 *
 * 항상 <h1> 을 렌더한다 — e2e route-manifest 의 여러 라우트가 `main h1`
 * ready-locator 에 의존하므로, 이 컴포넌트를 쓰는 한 구조적으로 보장된다.
 */
export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  back,
  className,
}: PageHeaderProps) => (
  <header className={cx("flex flex-col gap-4", className)}>
    {back !== undefined && (
      <Link
        href={back.href}
        className={cx(
          "inline-flex w-fit items-center gap-1 rounded-md py-1 pr-2 text-caption text-ink-muted",
          "transition-colors duration-150 hover:text-ink motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {back.label}
      </Link>
    )}

    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow !== undefined && (
          <p className="text-eyebrow text-ink-muted uppercase">{eyebrow}</p>
        )}
        <h1
          className={cx(
            "text-ink",
            // DESIGN.md heading-1(40px)은 대시보드 밀도에 과하다. 모바일 h3,
            // 데스크탑 h2 스케일을 쓰되 음수 트래킹은 토큰이 그대로 유지한다.
            eyebrow !== undefined ? "mt-2" : "",
            "text-h3 md:text-h2",
          )}
        >
          {title}
        </h1>
        {description !== undefined && (
          <p className="mt-3 max-w-2xl text-body-sm text-ink-muted">{description}</p>
        )}
      </div>

      {actions !== undefined && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  </header>
);
