"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/app/(dashboard)/_components/ui/button";
import { cx } from "@/app/(dashboard)/_components/ui/cx";

type PaginationProps = {
  /** 1부터 시작 */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** 결과: `${testIdPrefix}-previous-page` / `${testIdPrefix}-next-page` */
  testIdPrefix: string;
  className?: string;
};

/** 이전/다음 + 현재 위치. 페이지 수가 1 이하면 아무것도 렌더하지 않는다. */
export const Pagination = ({
  page,
  pageCount,
  onChange,
  testIdPrefix,
  className,
}: PaginationProps) => {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="페이지 이동"
      className={cx("flex items-center justify-between gap-3", className)}
    >
      <Button
        data-testid={`${testIdPrefix}-previous-page`}
        variant="utility"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        leadingIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
      >
        이전
      </Button>

      {/* 페이지가 바뀌었음을 스크린리더에 알린다. */}
      <p aria-live="polite" className="text-caption text-ink-muted">
        페이지 {page} / {pageCount}
      </p>

      <Button
        data-testid={`${testIdPrefix}-next-page`}
        variant="utility"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        trailingIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
      >
        다음
      </Button>
    </nav>
  );
};
