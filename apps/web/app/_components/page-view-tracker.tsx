"use client";

import { useEffect } from "react";

type PageViewTrackerProps = {
  pageType: "home" | "activity" | "exhibition";
  resourceId?: string;
};

export default function PageViewTracker({ pageType, resourceId }: PageViewTrackerProps) {
  useEffect(() => {
    // fire-and-forget: 에러 무시
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
