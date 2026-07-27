import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      // 대시보드 토큰(bg-hairline)을 쓴다. import 처가 전부 app/(dashboard) 이라
      // 공개 사이트에는 영향이 없다. 이전 값(bg-slate-200/80)은 다크에서 안 보였다.
      className={`animate-pulse rounded-md bg-hairline ${className}`}
      {...props}
    />
  );
}
