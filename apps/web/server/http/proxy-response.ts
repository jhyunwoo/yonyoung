import "server-only";
import { NextResponse } from "next/server";
import { FetchTimeoutError } from "@/server/http/fetch-with-timeout";

/** `/api/*`·`/api/auth/*` 프록시가 함께 쓰는 업스트림 응답 복사·오류 응답. */

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-encoding",
  "content-length",
]);

export const copyProxyResponse = (upstream: Response): NextResponse => {
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    // set-cookie는 여러 개일 수 있어 set()으로 복사하면 마지막 하나만 남는다. 아래에서 개별 append 한다.
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || normalizedKey === "set-cookie") {
      return;
    }
    response.headers.set(key, value);
  });

  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
};

/** `label`은 응답 메시지의 주어다 (예: "Upstream API", "Authentication API"). */
export const createUpstreamErrorResponse = (
  error: unknown,
  label: string,
): NextResponse => {
  if (error instanceof FetchTimeoutError) {
    return NextResponse.json(
      { ok: false, message: `${label} request timed out.` },
      {
        status: 504,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(
    { ok: false, message: `${label} request failed.` },
    {
      status: 502,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
};
