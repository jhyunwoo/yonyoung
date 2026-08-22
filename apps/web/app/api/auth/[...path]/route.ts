import { type NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/server/env";
import {
  API_PROXY_BODY_LIMIT_BYTES,
  buildUpstreamProxyHeaders,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
  normalizeProxyPath,
  resolvePublicRequestOrigin,
} from "@/server/security/request-guards";
import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const UPSTREAM_REQUEST_TIMEOUT_MS = 15_000;

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

const resolveForwardedRequestOrigin = (
  request: NextRequest,
): { host: string; protocol: "http" | "https" } => {
  const publicOrigin = resolvePublicRequestOrigin(request);
  if (!publicOrigin) {
    return {
      host: request.nextUrl.host,
      protocol: request.nextUrl.protocol === "http:" ? "http" : "https",
    };
  }

  const publicUrl = new URL(publicOrigin);
  return {
    host: publicUrl.host,
    protocol: publicUrl.protocol === "http:" ? "http" : "https",
  };
};

const createProxyResponse = (response: Response): NextResponse => {
  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
  });

  response.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized) || normalized === "set-cookie") {
      return;
    }

    nextResponse.headers.set(key, value);
  });

  const setCookies = response.headers.getSetCookie();
  for (const cookie of setCookies) {
    nextResponse.headers.append("set-cookie", cookie);
  }

  return nextResponse;
};

const createUpstreamErrorResponse = (error: unknown): NextResponse => {
  if (error instanceof FetchTimeoutError) {
    return NextResponse.json(
      { ok: false, message: "Authentication API request timed out." },
      {
        status: 504,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(
    { ok: false, message: "Authentication API request failed." },
    {
      status: 502,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
};

const handle = async (
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> => {
  const { path } = await context.params;
  const joinedPath = normalizeProxyPath({
    pathSegments: path,
    allowedPrefixes: path.length > 0 ? [path[0]!] : [],
  });
  if (!joinedPath) {
    return NextResponse.json({ ok: false, message: "Not Found" }, { status: 404 });
  }

  const csrfProtectionResponse = enforceSameOriginProtection(request, {
    requireCsrfHeader: true,
  });
  if (csrfProtectionResponse) {
    return csrfProtectionResponse;
  }

  const bodyLimitResponse = enforceRequestBodyLimit(request, API_PROXY_BODY_LIMIT_BYTES);
  if (bodyLimitResponse) {
    return bodyLimitResponse;
  }

  const upstreamUrl = `${getApiBaseUrl()}/api/auth/${joinedPath}${request.nextUrl.search}`;
  const hasRequestBody = request.method !== "GET" && request.method !== "HEAD";
  const requestBody = hasRequestBody ? request.body : undefined;
  const forwardedRequestOrigin = resolveForwardedRequestOrigin(request);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchWithTimeout(
      upstreamUrl,
      {
        method: request.method,
        headers: buildUpstreamProxyHeaders(request, {
          extraHeaders: {
            "x-forwarded-host": forwardedRequestOrigin.host,
            "x-forwarded-proto": forwardedRequestOrigin.protocol,
          },
        }),
        body: requestBody,
        ...(requestBody ? { duplex: "half" as const } : {}),
        redirect: "manual",
        cache: "no-store",
        signal: request.signal,
      },
      UPSTREAM_REQUEST_TIMEOUT_MS,
    );
  } catch (error) {
    return createUpstreamErrorResponse(error);
  }

  return createProxyResponse(upstreamResponse);
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
