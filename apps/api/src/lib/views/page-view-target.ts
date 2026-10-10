export type PageViewType = "home" | "activity" | "exhibition" | "notice";

export const isEntityPageViewType = (
  pageType: PageViewType,
): pageType is "activity" | "exhibition" =>
  pageType === "activity" || pageType === "exhibition";

/**
 * Home and notice are singleton pages. Canonical IDs keep both counters
 * bounded even when older clients send an arbitrary resourceId.
 */
export const normalizePageViewResourceId = (
  pageType: PageViewType,
  resourceId: string | undefined,
): string => {
  if (pageType === "home" || pageType === "notice") {
    return pageType;
  }

  return resourceId ?? "";
};

export type PageViewDevice = "mobile" | "tablet" | "desktop";

const HOSTNAME_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * 공개 엔드포인트라 클라이언트가 보낸 값을 그대로 믿지 않는다.
 * 호스트명 형식이 아니면 "other" 한 버킷으로 모아 행 수가 늘어나지 않게 한다.
 */
export const normalizeReferrerHost = (raw: string | undefined): string => {
  const trimmed = raw?.trim().toLowerCase();
  if (!trimmed) {
    return "direct";
  }

  const host = trimmed.replace(/^(www|m)\./, "");
  if (host.length > 253 || !HOSTNAME_PATTERN.test(host)) {
    return "other";
  }
  return host;
};

export const classifyDevice = (userAgent: string | undefined): PageViewDevice => {
  if (!userAgent) {
    return "desktop";
  }
  if (/iPad|Tablet/i.test(userAgent) || /Android(?!.*Mobile)/i.test(userAgent)) {
    return "tablet";
  }
  if (/Mobi|iPhone|Android/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
};
