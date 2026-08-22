"use client";

import { Eye } from "lucide-react";

type ViewCountBadgeProps = {
  count: number;
  className?: string;
};

const formatViewCount = (count: number): string => {
  if (count >= 10_000) {
    return `${(count / 10_000).toFixed(1)}만`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}천`;
  }
  return count.toLocaleString("ko-KR");
};

/**
 * 조회수를 눈 아이콘과 함께 표시하는 배지 컴포넌트.
 * 목록 페이지에서 카드 위에 오버레이 또는 인라인으로 사용.
 */
export default function ViewCountBadge({ count, className = "" }: ViewCountBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs tabular-nums ${className}`}
      aria-label={`조회수 ${count}`}
    >
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{formatViewCount(count)}</span>
    </span>
  );
}
