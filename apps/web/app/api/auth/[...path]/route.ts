import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";

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

const createProxyResponse = (response: Response): NextResponse => {
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
  });

  response.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    nextResponse.headers.set(key, value);
  });

  return nextResponse;
};

const handle = async (
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> => {
  const { path } = await context.params;
  const joinedPath = path.join("/");
  const upstreamUrl = `${env.API_BASE_URL}/api/auth/${joinedPath}${request.nextUrl.search}`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body:
      request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
    cache: "no-store",
  });

  return createProxyResponse(upstreamResponse);
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
