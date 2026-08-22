"use client";

import { useEffect, useState } from "react";

type ViewCounts = Record<string, number>;

/**
 * 여러 리소스의 조회수를 일괄 조회하는 클라이언트 훅.
 * GET /api/public/views?resourceType={type}&resourceIds={ids} 호출.
 * CDN 캐시(30초 브라우저, 120초 CDN)를 활용합니다.
 */
export function useViewCounts(
  resourceType: "activity" | "exhibition",
  resourceIds: string[],
): ViewCounts {
  const [counts, setCounts] = useState<ViewCounts>({});
  const idsKey = resourceIds.join(",");

  useEffect(() => {
    if (resourceIds.length === 0) {
      return;
    }

    let cancelled = false;

    fetch(`/api/public/views?resourceType=${resourceType}&resourceIds=${idsKey}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(({ data }: { data: ViewCounts }) => {
        if (!cancelled) {
          setCounts(data ?? {});
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCounts({});
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType, idsKey]);

  return counts;
}

/**
 * 단일 리소스의 조회수를 조회하는 편의 훅.
 */
export function useSingleViewCount(
  resourceType: "activity" | "exhibition",
  resourceId: string,
): number {
  const counts = useViewCounts(resourceType, [resourceId]);
  return counts[resourceId] ?? 0;
}
