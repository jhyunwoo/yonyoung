"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useViewCounts } from "@/features/public/services/use-view-counts";
import ViewCountBadge from "@/app/(home)/_components/view-count-badge";

type ViewCounts = Record<string, number>;

const ViewCountsContext = createContext<ViewCounts>({});

type ArchiveViewCountsProviderProps = {
  resourceType: "activity" | "exhibition";
  resourceIds: string[];
  children: ReactNode;
};

/**
 * 목록 전체의 조회수를 한 번만 조회해 카드들에 나눠준다.
 *
 * 예전에는 카드마다 `useViewCounts(type, 전체ID)`를 호출해서 동일한
 * `/api/public/views` 요청이 카드 수만큼(활동 목록 기준 14번) 병렬로 나갔다.
 * 요청은 목록당 하나면 충분하므로 그리드를 감싸는 이 provider에서만 호출한다.
 */
export function ArchiveViewCountsProvider({
  resourceType,
  resourceIds,
  children,
}: ArchiveViewCountsProviderProps) {
  const counts = useViewCounts(resourceType, resourceIds);

  return <ViewCountsContext value={counts}>{children}</ViewCountsContext>;
}

type ArchiveViewCountsProps = {
  resourceId: string;
  className?: string;
};

/** 카드 한 장의 조회수 배지. 값은 `ArchiveViewCountsProvider`가 받아온 것을 쓴다. */
export default function ArchiveViewCounts({
  resourceId,
  className = "",
}: ArchiveViewCountsProps) {
  const counts = useContext(ViewCountsContext);
  const count = counts[resourceId] ?? 0;

  return <ViewCountBadge count={count} className={`text-white/90 ${className}`} />;
}
