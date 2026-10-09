import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createD1McpConnectionStore } from "../../src/features/mcp/mcp-connection-store";

const db = env.db as D1Database;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
  await db.batch([
    db.prepare("INSERT INTO user (id, name, email) VALUES ('u1', 'u1', 'u1@example.test')"),
    db.prepare(
      "INSERT INTO oauth_client (id, client_id, redirect_uris, name) VALUES ('oc1', 'c1', '[\"https://claude.ai/api/mcp/auth_callback\"]', 'Claude')",
    ),
    db.prepare(
      "INSERT INTO oauth_consent (id, client_id, user_id, scopes, created_at, updated_at) VALUES ('cs1', 'c1', 'u1', '[\"openid\",\"mcp\"]', 1, 2)",
    ),
    db.prepare(
      "INSERT INTO oauth_refresh_token (id, token, client_id, user_id, scopes) VALUES ('rt1', 'refresh-token', 'c1', 'u1', '[\"mcp\"]')",
    ),
  ]);
});

describe("D1 MCP 연결 저장소", () => {
  it("동의를 보여주고, 해제하면 리프레시 토큰을 폐기한다", async () => {
    const store = createD1McpConnectionStore(db);
    expect(await store.hasConsent("u1", "c1")).toBe(true);
    expect(await store.list("u1")).toMatchObject([
      { clientId: "c1", clientName: "Claude", scopes: ["openid", "mcp"] },
    ]);

    expect(await store.getClient("c1")).toEqual({ clientId: "c1", name: "Claude", uri: null });
    expect(await store.getClient("missing")).toBeNull();

    expect(await store.revoke("u1", "c1", 123)).toBe(true);
    expect(await store.hasConsent("u1", "c1")).toBe(false);
    const token = await db
      .prepare("SELECT revoked FROM oauth_refresh_token WHERE id = 'rt1'")
      .first<{ revoked: number | null }>();
    expect(token?.revoked).toBe(123);
  });
});
