import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createD1UploadReservationStore } from "../../src/lib/uploads/upload-reservation";

const db = env.db as D1Database;
const GRACE_MS = 2 * 60 * 1000;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
});

describe("D1 업로드 예약 저장소", () => {
  it("슬롯만 반납하고 용량은 URL 만료까지 잡아 두며, 다시 불러도 줄어들지 않는다", async () => {
    const store = createD1UploadReservationStore(db);
    const now = Date.now();
    const grantExpiresAt = now + 60 * 60 * 1000;
    await store.reserve({
      id: "activities/actor-1/detail/8f14e45f-ceea-467a-9575-9b5a4a4c1234",
      actorId: "actor-1",
      fileSize: 1024,
      observedUsedBytes: 0,
      observedAt: now,
      grantExpiresAt,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
    const id = "activities/actor-1/detail/8f14e45f-ceea-467a-9575-9b5a4a4c1234";

    const releasedAt = Date.now();
    await store.holdUntilGrantExpiry(id, releasedAt, GRACE_MS);
    const held = await store.get(id);
    expect(held?.grantExpiresAt).toBe(releasedAt);
    expect(held?.expiresAt).toBe(grantExpiresAt + GRACE_MS);

    await store.holdUntilGrantExpiry(id, releasedAt + 1_000, GRACE_MS);
    expect(await store.get(id)).toEqual(held);
  });
});
