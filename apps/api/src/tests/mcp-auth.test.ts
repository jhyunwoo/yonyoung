import { describe, expect, it } from "vitest";
import { toMcpTokenIdentity } from "../features/mcp/mcp-auth";
import {
  createMemoryMcpConnectionStore,
  isTokenIssuedUnderConsent,
} from "../features/mcp/mcp-connection-store";
import { resolveMcpRuntimeEnv } from "../lib/config/runtime-env";
import { createApp } from "../app";

const AUTH_TEST_ENV = {
  BETTER_AUTH_URL: "https://web.example.test",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://web.example.test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  MCP_RESOURCE_URL: "https://api.example.test/mcp",
  MCP_AUTH_ISSUER: "https://web.example.test/api/auth",
  db: {} as D1Database,
};

describe("MCP 런타임 환경", () => {
  it("명시한 리소스 URL과 issuer를 쓴다", () => {
    expect(resolveMcpRuntimeEnv(AUTH_TEST_ENV)).toEqual({
      resourceUrl: "https://api.example.test/mcp",
      issuer: "https://web.example.test/api/auth",
      resourceMetadataUrl:
        "https://api.example.test/.well-known/oauth-protected-resource/mcp",
    });
  });

  it("값이 없으면 BETTER_AUTH_URL에서 기본값을 만든다", () => {
    const env = resolveMcpRuntimeEnv({ BETTER_AUTH_URL: "http://localhost:8787" });
    expect(env.resourceUrl).toBe("http://localhost:8787/mcp");
    expect(env.issuer).toBe("http://localhost:8787/api/auth");
  });
});

describe("토큰 클레임 해석", () => {
  it("사용자 토큰에서 sub, azp, scope를 꺼낸다", () => {
    expect(
      toMcpTokenIdentity({ sub: "user-1", azp: "client-1", scope: "openid mcp" }),
    ).toEqual({
      userId: "user-1",
      clientId: "client-1",
      scopes: ["openid", "mcp"],
      issuedAt: null,
    });
  });

  it("iat를 발급 시각으로 꺼낸다", () => {
    expect(
      toMcpTokenIdentity({ sub: "user-1", azp: "client-1", scope: "mcp", iat: 1_700_000_000 }),
    ).toMatchObject({ issuedAt: 1_700_000_000 });
  });

  it("client_credentials 토큰(sub=client)은 거부한다", () => {
    expect(toMcpTokenIdentity({ sub: "client-1", azp: "client-1", scope: "mcp" })).toBeNull();
  });

  it("sub나 클라이언트가 없으면 거부한다", () => {
    expect(toMcpTokenIdentity({ azp: "client-1" })).toBeNull();
    expect(toMcpTokenIdentity({ sub: "user-1" })).toBeNull();
  });
});

describe("동의 이전에 발급된 토큰", () => {
  const consentCreatedAtMs = 1_700_000_000_500;

  it("동의보다 먼저 발급된 토큰은 그 동의로 인정하지 않는다", () => {
    expect(isTokenIssuedUnderConsent(1_699_999_999, consentCreatedAtMs)).toBe(false);
  });

  it("동의와 같은 초 또는 그 뒤에 발급된 토큰은 인정한다", () => {
    expect(isTokenIssuedUnderConsent(1_700_000_000, consentCreatedAtMs)).toBe(true);
    expect(isTokenIssuedUnderConsent(1_700_000_060, consentCreatedAtMs)).toBe(true);
  });

  it("발급 시각이 없는 토큰은 거부하고, 생성 시각이 없는 동의는 막지 않는다", () => {
    expect(isTokenIssuedUnderConsent(null, consentCreatedAtMs)).toBe(false);
    expect(isTokenIssuedUnderConsent(1_699_999_999, null)).toBe(true);
  });

  it("연결을 해제하고 다시 연결하면 해제 전 토큰은 통과하지 못한다", async () => {
    const store = createMemoryMcpConnectionStore([
      { userId: "u1", clientId: "c1", connectedAt: consentCreatedAtMs },
    ]);
    expect(await store.hasConsent("u1", "c1", 1_699_999_000)).toBe(false);
    expect(await store.hasConsent("u1", "c1", 1_700_000_100)).toBe(true);
  });
});

describe("메모리 연결 저장소", () => {
  it("동의를 확인하고 해제한다", async () => {
    const store = createMemoryMcpConnectionStore([
      { userId: "u1", clientId: "c1", clientName: "Claude" },
    ]);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
    expect(await store.list("u1")).toMatchObject([{ clientId: "c1", clientName: "Claude" }]);
    expect(await store.revoke("u1", "c1", Date.now())).toBe(true);
    expect(await store.hasConsent("u1", "c1")).toBe(false);
    expect(await store.revoke("u1", "c1", Date.now())).toBe(false);
  });

  it("다른 사용자의 연결은 해제하지 못한다", async () => {
    const store = createMemoryMcpConnectionStore([{ userId: "u1", clientId: "c1" }]);
    expect(await store.revoke("u2", "c1", Date.now())).toBe(false);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
  });
});

describe("보호 리소스 메타데이터", () => {
  it("MCP 리소스와 인증 서버를 알려준다", async () => {
    const app = createApp();
    const response = await app.request(
      "https://api.example.test/.well-known/oauth-protected-resource/mcp",
      {},
      AUTH_TEST_ENV,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      resource: string;
      authorization_servers: string[];
      scopes_supported?: string[];
    };
    expect(body.resource).toBe("https://api.example.test/mcp");
    expect(body.authorization_servers).toEqual(["https://web.example.test/api/auth"]);
    expect(body.scopes_supported).toContain("mcp");
  });
});
