import type { ReactNode } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

/**
 * 페이지 본문 래퍼.
 *
 * <main> 은 DashboardShell 이 단독으로 소유한다 — 재디자인 이전에는 셸과 각
 * 페이지가 모두 <main> 을 렌더해 랜드마크가 중첩돼 있었다.
 * 컨테이너 폭은 DESIGN.md 의 1080–1300px 기준을 따라 max-w-6xl 로 고정한다.
 */
export const PageContainer = ({
  className,
  children,
  ...rest
}: {
  className?: string;
  children: ReactNode;
} & Record<`data-${string}`, string | undefined>) => (
  <div
    className={cx(
      "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

/**
 * 긴 폼의 하단 고정 액션 바.
 *
 * 모바일에서 저장 버튼을 찾으려고 끝까지 스크롤할 필요를 없앤다.
 * 홈 인디케이터에 가리지 않도록 safe-area 인셋을 더한다.
 */
export const StickyActionBar = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={cx(
      "sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col-reverse gap-2 border-t border-hairline",
      "bg-surface/95 px-4 pt-3 backdrop-blur md:-mx-6 md:px-6",
      "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
      "sm:flex-row sm:items-center sm:justify-end",
      className,
    )}
  >
    {children}
  </div>
);

/**
 * 키보드 사용자가 사이드바 전체를 탭으로 통과하지 않고 본문으로 건너뛰게 한다.
 * 평소에는 숨겨져 있다가 포커스를 받으면 나타난다.
 */
export const SkipLink = ({ targetId }: { targetId: string }) => (
  <a
    href={`#${targetId}`}
    className={cx(
      "sr-only focus:not-sr-only",
      "focus:fixed focus:top-3 focus:left-3 focus:z-50",
      "focus:rounded-md focus:border focus:border-hairline focus:bg-surface",
      "focus:px-4 focus:py-2.5 focus:text-body-sm focus:font-medium focus:text-ink",
      "focus:shadow-elevated",
    )}
  >
    본문으로 건너뛰기
  </a>
);
