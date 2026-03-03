import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/server/env";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

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
]);

const EXCLUDED_PREFIXES = new Set(["internal", "auth"]);

const buildUpstreamHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) {
      return;
    }

    headers.set(key, value);
  });

  return headers;
};

const copyResponse = (upstream: Response): NextResponse => {
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }
    response.headers.set(key, value);
  });

  return response;
};

const handle = async (
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> => {
  const { path } = await context.params;

  if (path.length === 0 || EXCLUDED_PREFIXES.has(path[0])) {
    return NextResponse.json({ ok: false, message: "Not Found" }, { status: 404 });
  }

  const upstreamPath = path.join("/");
  const upstreamUrl = `${getApiBaseUrl()}/api/${upstreamPath}${request.nextUrl.search}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body:
      request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    cache: "no-store",
    redirect: "manual",
  });

  return copyResponse(upstreamResponse);
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
