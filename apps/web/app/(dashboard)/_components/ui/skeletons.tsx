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

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={`list-skeleton-${index + 1}`}
        className="flex items-center gap-3 rounded-lg border border-hairline bg-surface px-3.5 py-3"
      >
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
);

export const GridSkeleton = ({ items = 6 }: { items?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: items }).map((_, index) => (
      <div
        key={`grid-skeleton-${index + 1}`}
        className="rounded-lg border border-hairline bg-surface p-4"
      >
        <Skeleton className="aspect-video w-full rounded-md" />
        <Skeleton className="mt-3 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <div className="flex flex-col gap-5">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={`form-skeleton-${index + 1}`}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-11 w-full rounded-xs" />
      </div>
    ))}
    <Skeleton className="h-11 w-32 rounded-md" />
  </div>
);

/** 라우트 단위 loading.tsx 용 기본 조합. */
export const PageSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
    <PageHeaderSkeleton />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    <ListSkeleton />
  </div>
);
