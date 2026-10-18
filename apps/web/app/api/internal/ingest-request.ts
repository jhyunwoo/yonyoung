import { type NextRequest, NextResponse } from "next/server";

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
