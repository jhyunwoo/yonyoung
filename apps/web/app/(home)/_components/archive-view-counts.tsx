"use client";

import { useViewCounts } from "@/features/public/services/use-view-counts";
import ViewCountBadge from "@/app/(home)/_components/view-count-badge";

type ArchiveViewCountsProps = {
  resourceType: "activity" | "exhibition";
  resourceIds: string[];
  resourceId: string;
  className?: string;
};

/**
 * 아카이브 목록의 각 항목에서 조회수를 표시하기 위한 클라이언트 컴포넌트.
 * 부모에서 resourceIds 목록을 넘겨받아 useViewCounts 훅 하나로 일괄 조회하고 싶지만,
 * 개별 카드에서 사용하기 편리하도록 resourceId를 받아 해당 카운트만 렌더링합니다.
 * (useViewCounts 훅 내부에서 동일한 resourceIds가 들어오면 캐시된 결과를 반환하거나
 * 적절히 처리할 수 있도록 구현되어 있는지 확인이 필요함)
 */
export default function ArchiveViewCounts({
  resourceType,
  resourceIds,
  resourceId,
  className = "",
}: ArchiveViewCountsProps) {
  const counts = useViewCounts(resourceType, resourceIds);
  const count = counts[resourceId] ?? 0;

  return <ViewCountBadge count={count} className={`text-white/90 ${className}`} />;
}
