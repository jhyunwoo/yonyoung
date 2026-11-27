import "server-only";
import { trimToNull } from "@/shared/utils/trim-to-null";

const MAX_METADATA_KEYS = 20;
const MAX_ROUTE_LENGTH = 512;
const MAX_LABEL_LENGTH = 64;
const UNKNOWN_ROUTE = "/unknown";

/**
 * 수집 라우트는 로그인 없이 열려 있고 본문의 문자열이 그대로 로그에 실린다.
 * 값을 거절하면 정상 이벤트까지 잃으므로 길이만 잘라 한 줄의 크기를 묶는다.
 */
export const truncateForLog = (value: string, maxLength = MAX_LABEL_LENGTH): string =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

export const normalizeObservedRoute = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return UNKNOWN_ROUTE;
  }

  try {
    return truncateForLog(
      new URL(trimmed, "https://telemetry.invalid").pathname || "/",
      MAX_ROUTE_LENGTH,
    );
  } catch {
    return UNKNOWN_ROUTE;
  }
};

export const summarizeClientErrorForLog = (input: {
  message?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}) => {
  const message = trimToNull(input.message);
  const stack = trimToNull(input.stack);
  const metadataKeys = Object.keys(input.metadata ?? {})
    .sort()
    .slice(0, MAX_METADATA_KEYS)
    .map((key) => truncateForLog(key));

  return {
    messagePresent: message !== null,
    messageLength: message?.length ?? 0,
    stackPresent: stack !== null,
    stackLineCount: stack ? stack.split(/\r?\n/).filter(Boolean).length : 0,
    metadataKeyCount: metadataKeys.length,
    metadataKeys,
  };
};

const readMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null => {
  const value = metadata?.[key];
  return typeof value === "string" ? trimToNull(value) : null;
};

export const summarizeRouterTransitionForLog = (input: {
  metadata?: Record<string, unknown>;
}) => {
  const navigationType = readMetadataString(input.metadata, "navigationType");
  const targetUrl = readMetadataString(input.metadata, "url");

  return {
    navigationType: navigationType ? truncateForLog(navigationType) : null,
    targetRoute: targetUrl ? normalizeObservedRoute(targetUrl) : UNKNOWN_ROUTE,
  };
};

export const summarizeWebVitalForLog = (input: {
  id: string;
  name: string;
  value: number;
  rating: string;
  delta?: number;
  navigationType?: string;
  sampledAt?: number;
}) => ({
  id: truncateForLog(input.id),
  name: input.name,
  value: input.value,
  rating: truncateForLog(input.rating),
  delta: input.delta,
  navigationType:
    input.navigationType === undefined
      ? undefined
      : truncateForLog(input.navigationType),
  sampledAt: input.sampledAt,
});
