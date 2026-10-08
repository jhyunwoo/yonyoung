import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl } from "@/server/env";
import { fetchWithTimeout, FetchTimeoutError } from "@/server/http/fetch-with-timeout";
import {
  buildUpstreamProxyHeaders,
  resolvePublicRequestOrigin,
} from "@/server/security/request-guards";

const METADATA_TIMEOUT_MS = 10_000;

/**
 * RFC 8414: issuer가 https://host/api/auth이면 메타데이터는
 * https://host/.well-known/oauth-authorization-server/api/auth에 있어야 한다.
 * Better Auth는 /api/auth/.well-known/* 에서 만들므로 그 문서를 웹 오리진 기준으로 가져온다.
 */
export const proxyAuthMetadata = async (
  request: NextRequest,
  document: "oauth-authorization-server" | "openid-configuration",
): Promise<NextResponse> => {
  const publicOrigin = new URL(resolvePublicRequestOrigin(request) ?? request.nextUrl.origin);
  try {
    const upstream = await fetchWithTimeout(
      `${getApiBaseUrl()}/api/auth/.well-known/${document}`,
      {
        method: "GET",
        headers: buildUpstreamProxyHeaders(request, {
          extraHeaders: {
            "x-forwarded-host": publicOrigin.host,
            "x-forwarded-proto": publicOrigin.protocol.replace(":", ""),
          },
        }),
        cache: "no-store",
        redirect: "manual",
      },
      METADATA_TIMEOUT_MS,
    );
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "temporarily_unavailable" },
      { status: error instanceof FetchTimeoutError ? 504 : 502 },
    );
  }
};
