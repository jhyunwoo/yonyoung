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
});
