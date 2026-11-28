import { timingSafeEqual } from "node:crypto";
import type { Context } from "hono";
import type HonoAppType from "../../types/honoAppType";

/**
 * 웹 BFF(`apps/web/app/api/[...path]/route.ts`)가 방문자 IP를 실어 보내는 헤더.
 *
 * 브라우저는 API를 직접 부르지 않고 웹 서버(단일 호스트)를 거친다. 그래서
 * `cf-connecting-ip`는 모든 방문자에게 웹 서버 IP 하나로 보이고, 조회수 rate limit이
 * 사이트 전체에서 버킷 하나(분당 30회)를 공유해 실제 조회가 조용히 버려졌다.
 * 공유 비밀(PROXY_CLIENT_IP_SECRET)을 함께 보낸 요청의 헤더만 신뢰한다 — 비밀이 없거나
 * 틀리면 누구나 헤더를 위조할 수 있으므로 기존처럼 `cf-connecting-ip`를 쓴다.
 */
export const FORWARDED_CLIENT_IP_HEADER = "x-yonyoung-client-ip";
export const PROXY_AUTH_HEADER = "x-yonyoung-proxy-auth";

// IPv4/IPv6 문자만 허용해 rate limit 키에 임의 문자열이 섞이지 않게 한다.
const PLAUSIBLE_IP_PATTERN = /^[0-9a-f:.]{2,45}$/i;

const timingSafeEqualString = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

/**
 * 웹 BFF가 보낸 요청인지(공유 비밀 일치) 확인한다. 비밀이 설정되지 않은 구성에서는
 * 구분할 방법이 없으므로 `null`을 돌려준다.
 */
export const isTrustedProxyRequest = (
  c: Context<HonoAppType>,
): boolean | null => {
  const secret = c.env?.PROXY_CLIENT_IP_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const presented = c.req.header(PROXY_AUTH_HEADER)?.trim();
  return Boolean(presented) && timingSafeEqualString(presented ?? "", secret);
};

/**
 * IPv6 회선은 보통 /64 대역을 통째로 받는다. 주소 전체를 키로 쓰면 같은 회선 안에서 주소만
 * 바꿔 한도를 무제한으로 피할 수 있으므로 앞 64비트로 묶는다. IPv4(및 IPv4-mapped)는 그대로 둔다.
 */
const toRateLimitKey = (ip: string): string => {
  if (!ip.includes(":") || ip.includes(".")) {
    return ip;
  }

  const [head = "", tail] = ip.toLowerCase().split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? headGroups
      : [
          ...headGroups,
          ...Array<string>(
            Math.max(0, 8 - headGroups.length - tailGroups.length),
          ).fill("0"),
          ...tailGroups,
        ];
  if (groups.length !== 8) {
    return ip;
  }

  const prefix = groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":");
  return `${prefix}::/64`;
};

/** rate limit 키로 쓸 방문자 식별값. IPv6는 /64 대역으로 묶어서 돌려준다. */
export const resolveTrustedClientIp = (c: Context<HonoAppType>): string => {
  const secret = c.env?.PROXY_CLIENT_IP_SECRET?.trim();
  const presented = c.req.header(PROXY_AUTH_HEADER)?.trim();
  const forwardedIp = c.req.header(FORWARDED_CLIENT_IP_HEADER)?.trim();

  if (
    secret &&
    presented &&
    forwardedIp &&
    PLAUSIBLE_IP_PATTERN.test(forwardedIp) &&
    timingSafeEqualString(presented, secret)
  ) {
    return toRateLimitKey(forwardedIp);
  }

  return toRateLimitKey(c.req.header("cf-connecting-ip")?.trim() || "unknown");
};
