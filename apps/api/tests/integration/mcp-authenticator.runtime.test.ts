import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createBetterAuthMcpAuthenticator,
  type McpTokenIdentity,
} from "../../src/features/mcp/mcp-auth";
import { createAuthWithEnv } from "../../src/lib/auth";
import type HonoAppType from "../../src/types/honoAppType";

const WEB_ORIGIN = "https://web.example.test";
const RESOURCE_URL = "https://api.example.test/mcp";
const ISSUER = `${WEB_ORIGIN}/api/auth`;
const db = env.db as D1Database;

const createTestAuth = () =>
  createAuthWithEnv(db, {
    baseURL: WEB_ORIGIN,
    secret: "test-secret-that-is-at-least-32-characters-long",
    trustedOrigins: [WEB_ORIGIN],
    googleClientId: "google-id",
    googleClientSecret: "google-secret",
    emailAndPasswordEnabled: false,
    mcpResourceUrl: RESOURCE_URL,
    mcpIssuer: ISSUER,
  });
let auth: ReturnType<typeof createTestAuth>;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
  auth = createTestAuth();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MCP 토큰 검증 (Workers 런타임)", () => {
  it("Better Auth가 서명한 토큰을 D1의 키로 네트워크 없이 검증한다", async () => {
    const { token } = await auth.api.signJWT({
      body: {
        payload: {
          iss: ISSUER,
          aud: RESOURCE_URL,
          sub: "user-1",
          azp: "client-1",
          scope: "mcp",
        },
      },
    });
    const fetchMock = vi.fn(() => Promise.reject(new Error("network disabled")));
    vi.stubGlobal("fetch", fetchMock);

    const authenticate = createBetterAuthMcpAuthenticator(() => auth.api.getJwks());
    const received: McpTokenIdentity[] = [];
    const app = new Hono<HonoAppType>();
    app.post("/mcp", (c) =>
      authenticate(c, async (identity) => {
        received.push(identity);
        return c.json({ ok: true });
      }),
    );

    const response = await app.request(
      RESOURCE_URL,
      { method: "POST", headers: { authorization: `Bearer ${token}` } },
      {
        BETTER_AUTH_URL: WEB_ORIGIN,
        MCP_RESOURCE_URL: RESOURCE_URL,
        MCP_AUTH_ISSUER: ISSUER,
      },
    );

    expect(response.status).toBe(200);
    expect(received).toEqual([
      { userId: "user-1", clientId: "client-1", scopes: ["mcp"] },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
