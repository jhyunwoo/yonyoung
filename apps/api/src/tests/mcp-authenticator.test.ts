import { Hono } from "hono";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JSONWebKeySet,
  type JWTPayload,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createBetterAuthMcpAuthenticator,
  type McpTokenIdentity,
} from "../features/mcp/mcp-auth";
import type HonoAppType from "../types/honoAppType";

const KEY_ID = "test-key";
const RESOURCE_URL = "https://api.example.test/mcp";

let privateKey: CryptoKey;
let publicJwk: Record<string, unknown>;

beforeAll(async () => {
  const keys = await generateKeyPair("ES256");
  privateKey = keys.privateKey;
  publicJwk = { ...(await exportJWK(keys.publicKey)), kid: KEY_ID, alg: "ES256" };
});

// 키 세트는 issuer별로 캐시되므로 테스트마다 issuer를 다르게 둔다.
const createEnv = (name: string) => ({
  BETTER_AUTH_URL: "https://web.example.test",
  MCP_RESOURCE_URL: RESOURCE_URL,
  MCP_AUTH_ISSUER: `https://${name}.auth.example.test/api/auth`,
});

const createJwksLoader = () =>
  vi.fn(async () => ({ keys: [publicJwk] }) as JSONWebKeySet);

const signToken = (claims: JWTPayload) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

const createProtectedApp = (loadJwks = createJwksLoader()) => {
  const authenticate = createBetterAuthMcpAuthenticator(loadJwks);
  const received: McpTokenIdentity[] = [];
  const app = new Hono<HonoAppType>();
  app.post("/mcp", (c) =>
    authenticate(c, async (identity) => {
      received.push(identity);
      return c.json({ ok: true });
    }),
  );
  return { app, received, loadJwks };
};

const callMcp = (
  app: Hono<HonoAppType>,
  env: ReturnType<typeof createEnv>,
  token?: string,
) =>
  app.request(
    RESOURCE_URL,
    {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    },
    env,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createBetterAuthMcpAuthenticator", () => {
  it("유효한 토큰이면 후속 처리에 사용자, 클라이언트, scope를 넘긴다", async () => {
    const env = createEnv("valid");
    const { app, received, loadJwks } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "openid mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(200);
    expect(received).toEqual([
      { userId: "user-1", clientId: "client-1", scopes: ["openid", "mcp"] },
    ]);
    expect(loadJwks).toHaveBeenCalledTimes(1);
  });

  it("audience가 다르면 401", async () => {
    const env = createEnv("wrong-aud");
    const { app, received } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: "https://other.example.test/mcp",
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(401);
    expect(received).toEqual([]);
  });

  it("issuer가 다르면 401", async () => {
    const env = createEnv("wrong-iss");
    const { app, received } = createProtectedApp();
    const token = await signToken({
      iss: "https://evil.example.test/api/auth",
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(401);
    expect(received).toEqual([]);
  });

  it("mcp scope가 없으면 403", async () => {
    const env = createEnv("no-scope");
    const { app, received } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "openid profile",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toContain(
      'error="insufficient_scope"',
    );
    expect(received).toEqual([]);
  });

  it("client_credentials 토큰(sub=azp)은 401", async () => {
    const env = createEnv("client-token");
    const { app, received } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "client-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://api.example.test/.well-known/oauth-protected-resource/mcp"',
    );
    expect(received).toEqual([]);
  });

  it("키를 네트워크로 받지 않아 웹 오리진이 멈춰도 통과시킨다", async () => {
    const env = createEnv("no-network");
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { app, received } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(200);
    expect(received).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("키 세트를 issuer별로 캐시해 요청마다 다시 읽지 않는다", async () => {
    const env = createEnv("jwks-cache");
    const { app, received, loadJwks } = createProtectedApp();
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    await callMcp(app, env, token);
    await callMcp(app, env, token);

    expect(received).toHaveLength(2);
    expect(loadJwks).toHaveBeenCalledTimes(1);
  });

  it("키 조회가 실패하면 401로 감추지 않고 던진다", async () => {
    const env = createEnv("jwks-failure");
    const loadJwks = vi.fn(async (): Promise<JSONWebKeySet> => {
      throw new Error("D1 unavailable");
    });
    const { app, received } = createProtectedApp(loadJwks);
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(500);
    expect(received).toEqual([]);
  });

  it("만료된 토큰은 401", async () => {
    const env = createEnv("expired");
    const { app, received } = createProtectedApp();
    const token = await new SignJWT({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    })
      .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 300)
      .sign(privateKey);

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect(received).toEqual([]);
  });

  it("형식이 깨진 토큰은 401", async () => {
    const env = createEnv("malformed");
    const { app, received } = createProtectedApp();

    const response = await callMcp(app, env, "not-a-jwt");

    expect(response.status).toBe(401);
    expect(received).toEqual([]);
  });

  it("후속 처리가 던진 오류는 다시 시도하지 않는다", async () => {
    const env = createEnv("handler-error");
    const authenticate = createBetterAuthMcpAuthenticator(createJwksLoader());
    const onAuthenticated = vi.fn(async () => {
      throw new Error("tool failed");
    });
    const app = new Hono<HonoAppType>();
    app.post("/mcp", (c) => authenticate(c, onAuthenticated));
    const token = await signToken({
      iss: env.MCP_AUTH_ISSUER,
      aud: RESOURCE_URL,
      sub: "user-1",
      azp: "client-1",
      scope: "mcp",
    });

    const response = await callMcp(app, env, token);

    expect(response.status).toBe(500);
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it("Authorization 헤더가 없으면 resource_metadata를 담은 401", async () => {
    const env = createEnv("no-header");
    const { app, received } = createProtectedApp();

    const response = await callMcp(app, env);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect(received).toEqual([]);
  });
});
