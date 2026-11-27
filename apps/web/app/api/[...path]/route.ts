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
import { buildClientIpHeaders } from "@/server/http/client-ip-headers";
import { fetchWithTimeout } from "@/server/http/fetch-with-timeout";
import {
  copyProxyResponse,
  createUpstreamErrorResponse,
} from "@/server/http/proxy-response";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const UPSTREAM_REQUEST_TIMEOUT_MS = 45_000;

const resolveForwardedProtocol = (request: NextRequest): "http" | "https" => {
  return request.nextUrl.protocol === "http:" ? "http" : "https";
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

  const bodyLimitResponse = await enforceRequestBodyLimit(
    request,
    API_PROXY_BODY_LIMIT_BYTES,
  );
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
            ...buildClientIpHeaders(request),
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
    return createUpstreamErrorResponse(error, "Upstream API");
  }

  return copyProxyResponse(upstreamResponse);
};

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
