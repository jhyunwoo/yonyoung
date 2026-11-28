import { type NextRequest, NextResponse } from "next/server";
import { truncateForLog } from "@/server/observability/client-telemetry";

/** 내부 텔레메트리 수집 라우트(client-error, web-vitals)가 함께 쓰는 본문 해석과 수락 응답. */

/** sendBeacon은 content-type을 text/plain으로 보내므로 JSON이 아니어도 본문을 파싱해 본다. */
export const parseIngestBody = async (request: NextRequest): Promise<unknown> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const text = await request.text().catch(() => "");
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const createIngestAcceptedResponse = (): NextResponse =>
  NextResponse.json(
    { ok: true },
    {
      status: 202,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );

const INGEST_LOG_WINDOW_MS = 60_000;
const INGEST_LOG_MAX_PER_WINDOW = 600;
const INGEST_LOG_MAX_PER_CLIENT = 60;
const MAX_CLIENT_KEY_LENGTH = 64;
const UNKNOWN_CLIENT_KEY = "unknown";
const MAX_CORRELATION_ID_LENGTH = 128;

/**
 * 수집 라우트 하나의 프로세스 단위 상한(분당 600건)과 그 안의 클라이언트별 상한(분당 60건).
 * 라우트마다 따로 만들어 한쪽이 넘쳐도 다른 쪽 기록이 끊기지 않게 한다. 넘친 이벤트는 기록하지
 * 않고 버리며, 호출 쪽은 평소처럼 202로 응답한다 — 텔레메트리는 잃어도 되는 데이터다.
 *
 * 검증을 통과한 요청에만 부른다. 검증 전에 세면 쓰레기 요청만으로 상한이 바닥난다.
 *
 * 클라이언트 키는 `x-real-ip`다. 운영에서는 앞단(Traefik)이 덮어써 방문자가 정할 수 없다.
 * 프록시 없이 띄우면 위조할 수 있지만 그래도 라우트 상한은 넘지 못한다. 헤더가 없는 요청은
 * 한 키로 묶는다. 키는 기록을 허용할 때만 늘고 창이 바뀌면 비우므로 맵은 600개를 넘지 않는다.
 */
export const createIngestLogBudget = (): ((
  request: NextRequest,
  now?: number,
) => boolean) => {
  let windowStartedAt = 0;
  let windowCount = 0;
  const clientCounts = new Map<string, number>();

  return (request, now = Date.now()) => {
    if (now - windowStartedAt >= INGEST_LOG_WINDOW_MS) {
      windowStartedAt = now;
      windowCount = 0;
      clientCounts.clear();
    }
    if (windowCount >= INGEST_LOG_MAX_PER_WINDOW) {
      return false;
    }

    const clientKey =
      request.headers.get("x-real-ip")?.trim().slice(0, MAX_CLIENT_KEY_LENGTH) ||
      UNKNOWN_CLIENT_KEY;
    const clientCount = clientCounts.get(clientKey) ?? 0;
    if (clientCount >= INGEST_LOG_MAX_PER_CLIENT) {
      return false;
    }

    clientCounts.set(clientKey, clientCount + 1);
    windowCount += 1;
    return true;
  };
};

/** 추적 헤더도 요청이 정하는 값이라 길이를 묶어 로그에 싣는다. */
export const readCorrelationHeader = (
  request: NextRequest,
  name: string,
): string | undefined => {
  const value = request.headers.get(name)?.trim();
  return value ? truncateForLog(value, MAX_CORRELATION_ID_LENGTH) : undefined;
};
