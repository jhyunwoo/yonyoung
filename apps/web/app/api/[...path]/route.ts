import { type NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/server/env";
import {
  API_PROXY_BODY_LIMIT_BYTES,
  buildUpstreamProxyHeaders,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
  normalizeProxyPath,
} from "@/server/security/request-guards";
import {
  API_PROXY_ALLOWED_PREFIXES,
  API_PROXY_BLOCKED_PREFIXES,
} from "@/server/security/api-proxy-prefixes";
import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const UPSTREAM_REQUEST_TIMEOUT_MS = 45_000;

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

const resolveForwardedProtocol = (request: NextRequest): "http" | "https" => {
  return request.nextUrl.protocol === "http:" ? "http" : "https";
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

const createUpstreamErrorResponse = (error: unknown): NextResponse => {
  if (error instanceof FetchTimeoutError) {
    return NextResponse.json(
      { ok: false, message: "Upstream API request timed out." },
      {
        status: 504,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      },
    );
  }

  return NextResponse.json(
    { ok: false, message: "Upstream API request failed." },
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
  const upstreamPath = normalizeProxyPath({
    pathSegments: path,
    allowedPrefixes: API_PROXY_ALLOWED_PREFIXES,
    blockedPrefixes: API_PROXY_BLOCKED_PREFIXES,
  });
  if (!upstreamPath) {
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

  const upstreamUrl = `${getApiBaseUrl()}/api/${upstreamPath}${request.nextUrl.search}`;
  const hasRequestBody = request.method !== "GET" && request.method !== "HEAD";
  const requestBody = hasRequestBody ? request.body : undefined;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchWithTimeout(
      upstreamUrl,
      {
        method: request.method,
        headers: buildUpstreamProxyHeaders(request, {
          extraHeaders: {
            "x-forwarded-host": request.nextUrl.host,
            "x-forwarded-proto": resolveForwardedProtocol(request),
          },
        }),
        body: requestBody,
        ...(requestBody ? { duplex: "half" as const } : {}),
        cache: "no-store",
        redirect: "manual",
        signal: request.signal,
      },
      UPSTREAM_REQUEST_TIMEOUT_MS,
    );
  } catch (error) {
    return createUpstreamErrorResponse(error);
  }

  return copyResponse(upstreamResponse);
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
