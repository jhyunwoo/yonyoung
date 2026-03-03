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
  "content-encoding",
  "content-length",
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
  const upstreamUrl = `${getApiBaseUrl()}/api/auth/${joinedPath}${request.nextUrl.search}`;
  const hasRequestBody = request.method !== "GET" && request.method !== "HEAD";
  const requestBody = hasRequestBody ? request.body : undefined;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: buildUpstreamHeaders(request),
    body: requestBody,
    ...(requestBody ? { duplex: "half" as const } : {}),
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
