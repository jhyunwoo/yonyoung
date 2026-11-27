import "server-only";

import type { NextRequest } from "next/server";
import { getProxyClientIpSecret } from "@/server/env";

/**
 * 방문자 IP를 API에 전달한다(조회수·클라이언트 등록 rate limit 키). API는 공유 비밀이 일치할 때만 이 값을
 * 믿는다 — 비밀이 없으면 아무것도 보내지 않는다. 들어온 요청의 같은 이름 헤더는
 * `buildUpstreamProxyHeaders`의 allowlist에 없어 그대로 전달되지 않는다.
 */
export const buildClientIpHeaders = (request: NextRequest): Record<string, string> => {
  const secret = getProxyClientIpSecret();
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  if (!secret || !clientIp) {
    return {};
  }

  return {
    "x-yonyoung-client-ip": clientIp,
    "x-yonyoung-proxy-auth": secret,
  };
};
