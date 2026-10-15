import { Hono } from "hono";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
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

// 보호 핸들러와 JWKS는 issuer별로 캐시되므로 테스트마다 issuer를 다르게 둔다.
const createEnv = (name: string) => ({
  BETTER_AUTH_URL: "https://web.example.test",
  MCP_RESOURCE_URL: RESOURCE_URL,
  MCP_AUTH_ISSUER: `https://${name}.auth.example.test/api/auth`,
});

const stubJwks = (issuer: string) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== `${issuer}/jwks`) {
      return new Response("not found", { status: 404 });
    }
    return Response.json({ keys: [publicJwk] });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const signToken = (claims: JWTPayload) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

const createProtectedApp = () => {
  const authenticate = createBetterAuthMcpAuthenticator();
  const received: McpTokenIdentity[] = [];
  const app = new Hono<HonoAppType>();
  app.post("/mcp", (c) =>
    authenticate(c, async (identity) => {
      received.push(identity);
      return c.json({ ok: true });
    }),
  );
  return { app, received };
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
    const fetchMock = stubJwks(env.MCP_AUTH_ISSUER);
    const { app, received } = createProtectedApp();
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
    expect(fetchMock).toHaveBeenCalled();
  });

  it("audience가 다르면 401", async () => {
    const env = createEnv("wrong-aud");
    stubJwks(env.MCP_AUTH_ISSUER);
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
    stubJwks(env.MCP_AUTH_ISSUER);
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
    stubJwks(env.MCP_AUTH_ISSUER);
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
    stubJwks(env.MCP_AUTH_ISSUER);
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

  it("Authorization 헤더가 없으면 resource_metadata를 담은 401", async () => {
    const env = createEnv("no-header");
    stubJwks(env.MCP_AUTH_ISSUER);
    const { app, received } = createProtectedApp();

    const response = await callMcp(app, env);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect(received).toEqual([]);
  });
});
