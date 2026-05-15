"use client";

import { useSingleViewCount } from "@/features/public/services/use-view-counts";
import ViewCountBadge from "@/app/(home)/_components/view-count-badge";

type SingleViewCountProps = {
  resourceType: "activity" | "exhibition";
  resourceId: string;
  className?: string;
};

/**
 * 단일 리소스의 조회수를 fetch하고 표시하는 클라이언트 컴포넌트.
 * 상세 페이지 헤더에서 사용합니다.
 */
export default function SingleViewCount({
  resourceType,
  resourceId,
  className = "",
}: SingleViewCountProps) {
  const count = useSingleViewCount(resourceType, resourceId);

  return (
    <ViewCountBadge
      count={count}
      className={`text-sm text-(--text-muted) ${className}`}
    />
  );
}
