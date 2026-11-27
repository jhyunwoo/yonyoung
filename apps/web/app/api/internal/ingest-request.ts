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
const MAX_CORRELATION_ID_LENGTH = 128;

let ingestWindowStartedAt = 0;
let ingestWindowCount = 0;

/**
 * 수집 라우트 전체가 함께 쓰는 프로세스 단위 상한(분당 600건).
 * 방문자 IP는 프록시 설정에 따라 위조될 수 있어 키로 쓰지 않는다. 넘친 이벤트는 기록하지 않고
 * 버리며, 호출 쪽은 평소처럼 202로 응답한다 — 텔레메트리는 잃어도 되는 데이터다.
 */
export const allowIngestLog = (now = Date.now()): boolean => {
  if (now - ingestWindowStartedAt >= INGEST_LOG_WINDOW_MS) {
    ingestWindowStartedAt = now;
    ingestWindowCount = 0;
  }
  ingestWindowCount += 1;
  return ingestWindowCount <= INGEST_LOG_MAX_PER_WINDOW;
};

/** 추적 헤더도 요청이 정하는 값이라 길이를 묶어 로그에 싣는다. */
export const readCorrelationHeader = (
  request: NextRequest,
  name: string,
): string | undefined => {
  const value = request.headers.get(name)?.trim();
  return value ? truncateForLog(value, MAX_CORRELATION_ID_LENGTH) : undefined;
};
