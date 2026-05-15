"use client";

import { useEffect } from "react";

type PageViewTrackerProps = {
  pageType: "home" | "activity" | "exhibition";
  resourceId?: string;
};

export default function PageViewTracker({ pageType, resourceId }: PageViewTrackerProps) {
  useEffect(() => {
    // 새 조회수 API 호출 (fire-and-forget) — activity / exhibition 리소스만
    if ((pageType === "activity" || pageType === "exhibition") && resourceId) {
      fetch("/api/public/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: pageType,
          resourceId,
        }),
      }).catch(() => {});
    }

    // 기존 page-views 호출 유지 (내부 Analytics Engine)
    fetch("/api/public/page-views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-yonyoung-csrf": "1",
      },
      body: JSON.stringify({ pageType, resourceId }),
    }).catch(() => {});
  }, [pageType, resourceId]);

  return null;
}
