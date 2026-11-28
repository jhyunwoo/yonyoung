import type { Context } from "hono";
import { describe, expect, it } from "vitest";
import { resolveTrustedClientIp } from "../lib/http/client-ip";
import type HonoAppType from "../types/honoAppType";

const createContext = (input: {
  secret?: string;
  headers: Record<string, string>;
}) =>
  ({
    env: input.secret ? { PROXY_CLIENT_IP_SECRET: input.secret } : {},
    req: {
      header: (name: string) => input.headers[name.toLowerCase()],
    },
  }) as unknown as Context<HonoAppType>;

const SECRET = "shared-secret-for-client-ip";

describe("resolveTrustedClientIp", () => {
  it("공유 비밀이 일치하면 웹 BFF가 전달한 방문자 IP를 쓴다", () => {
    const c = createContext({
      secret: SECRET,
      headers: {
        "cf-connecting-ip": "192.0.2.10",
        "x-yonyoung-client-ip": "203.0.113.7",
        "x-yonyoung-proxy-auth": SECRET,
      },
    });

    expect(resolveTrustedClientIp(c)).toBe("203.0.113.7");
  });

  it("비밀이 틀리거나 설정되지 않았으면 전달된 IP를 무시한다", () => {
    const forged = {
      "cf-connecting-ip": "192.0.2.10",
      "x-yonyoung-client-ip": "203.0.113.7",
      "x-yonyoung-proxy-auth": "forged-secret-value-xxxxxxxxxx",
    };

    expect(resolveTrustedClientIp(createContext({ secret: SECRET, headers: forged }))).toBe(
      "192.0.2.10",
    );
    expect(resolveTrustedClientIp(createContext({ headers: forged }))).toBe("192.0.2.10");
  });

  it("IP 형식이 아닌 값은 rate limit 키로 쓰지 않는다", () => {
    const c = createContext({
      secret: SECRET,
      headers: {
        "x-yonyoung-client-ip": "anything; drop",
        "x-yonyoung-proxy-auth": SECRET,
      },
    });

    expect(resolveTrustedClientIp(c)).toBe("unknown");
  });

  it("IPv6는 /64 대역으로 묶어 같은 회선의 주소 바꾸기로 한도를 피하지 못하게 한다", () => {
    const keyOf = (ip: string) =>
      resolveTrustedClientIp(createContext({ headers: { "cf-connecting-ip": ip } }));

    expect(keyOf("2001:db8:1234:5678:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1234:5678::/64");
    expect(keyOf("2001:db8:1234:5678::1")).toBe("2001:db8:1234:5678::/64");
    expect(keyOf("2001:DB8:1234:5678:1:2:3:4")).toBe("2001:db8:1234:5678::/64");
    expect(keyOf("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(keyOf("::1")).toBe("0:0:0:0::/64");
    expect(keyOf("2001:db8:1234:5679::1")).not.toBe(keyOf("2001:db8:1234:5678::1"));
  });

  it("IPv4와 IPv4-mapped 주소는 그대로 쓴다", () => {
    const keyOf = (ip: string) =>
      resolveTrustedClientIp(createContext({ headers: { "cf-connecting-ip": ip } }));

    expect(keyOf("192.0.2.10")).toBe("192.0.2.10");
    expect(keyOf("::ffff:192.0.2.10")).toBe("::ffff:192.0.2.10");
  });
});
