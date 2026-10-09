import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createD1McpUploadStore } from "../../src/features/mcp/files/mcp-upload-store";
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

describe("D1 MCP 업로드 저장소", () => {
  it("수신 시작·완료·claim·release가 상태 전이를 지킨다", async () => {
    const store = createD1McpUploadStore(db);
    await store.create({
      id: "up-1",
      tokenHash: "hash-1",
      userId: "u1",
      purpose: "activity_image",
      fileName: "봄 출사 🌸.png",
      contentType: "image/png",
      declaredSize: 10,
      objectKey: "activities/u1/detail/x.png",
      publicUrl: "https://cdn.example.test/x.png",
      width: null,
      height: null,
      reservationId: null,
      status: "pending",
      expiresAt: Date.now() + 60_000,
      createdAt: Date.now(),
      completedAt: null,
    });

    expect(await store.beginReceiving("up-1", Date.now())).toBe(true);
    expect(await store.beginReceiving("up-1", Date.now())).toBe(false);
    await store.complete("up-1", { width: 3, height: 2, completedAt: Date.now() });
    expect((await store.getByTokenHash("hash-1"))?.fileName).toBe("봄 출사 🌸.png");

    expect(await store.claim(["up-1"], "u1")).toEqual(["up-1"]);
    expect(await store.claim(["up-1"], "u1")).toEqual([]);
    await store.release(["up-1"]);
    expect((await store.getById("up-1"))?.status).toBe("completed");
  });
});

describe("D1 MCP 업로드 claim", () => {
  it("여러 청크에 걸친 ID를 한 배치로 소비하고, 이미 쓴 업로드는 빼고 돌려준다", async () => {
    const ids = Array.from({ length: 120 }, (_, index) => `bulk-${index}`);
    await db.batch(
      ids.map((id) =>
        db
          .prepare(
            `INSERT INTO mcp_uploads (id, token_hash, user_id, purpose, file_name, content_type,
               declared_size, object_key, public_url, status, expires_at, completed_at)
             VALUES (?, ?, 'u1', 'activity_image', 'a.png', 'image/png', 1, ?, ?, ?, 0, 1)`,
          )
          .bind(id, `hash-${id}`, `key-${id}`, `https://cdn.example.test/${id}`,
            id === "bulk-100" ? "consumed" : "completed"),
      ),
    );

    const claimed = await createD1McpUploadStore(db).claim(ids, "u1");

    expect(claimed).toHaveLength(119);
    expect(claimed).not.toContain("bulk-100");
  });
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
