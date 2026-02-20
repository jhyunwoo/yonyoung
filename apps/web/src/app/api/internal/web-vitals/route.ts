import { NextRequest, NextResponse } from "next/server";

const VALID_METRIC_NAMES = new Set(["CLS", "INP", "LCP", "FCP", "TTFB"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = asString(body.name);
  const id = asString(body.id);
  const path = asString(body.path);
  const value = asNumber(body.value);
  const rating = asString(body.rating);

  if (!name || !id || value === null || !rating || !path) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!VALID_METRIC_NAMES.has(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  console.log(
    JSON.stringify({
      type: "web-vitals",
      metric: {
        id,
        name,
        value,
        rating,
        path,
      },
      timestamp: new Date().toISOString(),
    }),
  );

  return NextResponse.json(
    { ok: true },
    {
      status: 202,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
