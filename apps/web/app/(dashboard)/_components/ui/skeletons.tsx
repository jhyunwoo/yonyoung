import { Skeleton } from "@/components/ui/skeleton";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

/**
 * 스켈레톤 조합.
 *
 * 재디자인 이전에는 같은 모양의 스켈레톤 마크업이 11곳에 인라인으로 복사돼
 * 있었다(두 프로필 loading.tsx 는 키 접두사만 다른 바이트 단위 중복).
 * 개별 Skeleton 은 이미 aria-hidden 이므로 여기서 추가 처리는 하지 않는다.
 */

export const PageHeaderSkeleton = () => (
  <div>
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-7 w-56" />
    <Skeleton className="mt-3 h-4 w-full max-w-md" />
  </div>
);

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cx("rounded-lg border border-hairline bg-surface p-4 md:p-6", className)}
  >
    <Skeleton className="h-4 w-32" />
    <Skeleton className="mt-3 h-8 w-24" />
    <Skeleton className="mt-2 h-3 w-40" />
  </div>
);
