import { describe, expect, it } from "vitest";
import {
  createD1McpUploadStore,
  createMemoryMcpUploadStore,
  type McpUploadRecord,
} from "../features/mcp/files/mcp-upload-store";
import { createMemoryMcpObjectStore } from "../features/mcp/files/mcp-object-store";
import { streamOf } from "./mcp-file-fixtures";

const record = (overrides: Partial<McpUploadRecord> = {}): McpUploadRecord => ({
  id: "up-1",
  tokenHash: "hash-1",
  userId: "u1",
  purpose: "activity_image",
  fileName: "a.png",
  contentType: "image/png",
  declaredSize: 10,
  objectKey: "activities/u1/detail/a.png",
  publicUrl: "https://cdn.example.test/a.png",
  width: null,
  height: null,
  reservationId: "res-1",
  status: "pending",
  expiresAt: Date.now() + 60_000,
  createdAt: Date.now(),
  completedAt: null,
  ...overrides,
});

describe("메모리 업로드 저장소", () => {
  it("동시 수신은 한 번만 시작된다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    const results = await Promise.all([
      store.beginReceiving("up-1", Date.now()),
      store.beginReceiving("up-1", Date.now()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("만료된 업로드는 수신을 시작하지 않는다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record({ expiresAt: Date.now() - 1 }));
    expect(await store.beginReceiving("up-1", Date.now())).toBe(false);
  });

  it("완료된 업로드만, 소유자만 claim할 수 있고 두 번째 claim은 비어 있다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    await store.beginReceiving("up-1", Date.now());
    await store.complete("up-1", { width: 3, height: 2, completedAt: Date.now() });

    expect(await store.claim(["up-1"], "other")).toEqual([]);
    expect(await store.claim(["up-1"], "u1")).toEqual(["up-1"]);
    expect(await store.claim(["up-1"], "u1")).toEqual([]);

    await store.release(["up-1"]);
    expect((await store.getById("up-1"))?.status).toBe("completed");
  });

  it("discard는 완료된 소유자의 업로드만 failed로 바꾼다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record({ id: "a", status: "completed" }));
    await store.create(record({ id: "b", status: "consumed" }));
    await store.create(record({ id: "c", status: "completed", userId: "u2" }));
    expect(await store.discard(["a", "b", "c"], "u1")).toEqual(["a"]);
    expect((await store.getById("a"))?.status).toBe("failed");
    expect((await store.getById("b"))?.status).toBe("consumed");
    expect((await store.getById("c"))?.status).toBe("completed");
  });

  it("토큰 해시로 찾는다", async () => {
    const store = createMemoryMcpUploadStore();
    await store.create(record());
    expect((await store.getByTokenHash("hash-1"))?.id).toBe("up-1");
    expect(await store.getByTokenHash("nope")).toBeNull();
  });
});

describe("D1 업로드 저장소", () => {
  const D1_MAX_BOUND_PARAMETERS = 100;

  /** 바인딩 값이 D1 한도를 넘으면 실제 D1처럼 실패하고, claim은 묶인 ID를 그대로 RETURNING한다. */
  const createLimitedDatabase = () => {
    const boundCounts: number[] = [];
    const database = {
      prepare: () => ({
        bind: (...values: unknown[]) => {
          if (values.length > D1_MAX_BOUND_PARAMETERS) {
            throw new Error(`too many SQL variables: ${values.length}`);
          }
          boundCounts.push(values.length);
          const ids = values.filter((value): value is string => String(value).startsWith("up-"));
          return {
            all: async () => ({ results: ids.map((id) => ({ id })) }),
            run: async () => ({ meta: { changes: ids.length } }),
          };
        },
      }),
    } as unknown as Pick<D1Database, "prepare">;
    return { database, boundCounts };
  };

  const ids = Array.from({ length: 250 }, (_, index) => `up-${index}`);

  it("claim은 ID를 나눠 묶고 모든 문의 RETURNING ID를 합친다", async () => {
    const { database, boundCounts } = createLimitedDatabase();
    const claimed = await createD1McpUploadStore(database).claim(ids, "u1");

    expect(claimed).toEqual(ids);
    expect(boundCounts.length).toBeGreaterThan(1);
  });

  it("discard는 ID를 나눠 묶고 모든 문의 RETURNING ID를 합친다", async () => {
    const { database, boundCounts } = createLimitedDatabase();
    const discarded = await createD1McpUploadStore(database).discard(ids, "u1");

    expect(discarded).toEqual(ids);
    expect(boundCounts.length).toBeGreaterThan(1);
  });

  it("release는 여러 문으로 나눠 한도를 넘지 않는다", async () => {
    const { database, boundCounts } = createLimitedDatabase();
    await createD1McpUploadStore(database).release(ids);

    expect(boundCounts.length).toBeGreaterThan(1);
    expect(boundCounts.reduce((sum, count) => sum + count, 0)).toBe(ids.length);
  });
});

describe("메모리 객체 저장소", () => {
  it("스트림을 모두 읽어 저장한다", async () => {
    const objects = createMemoryMcpObjectStore();
    await objects.put("k", streamOf(new Uint8Array([1, 2, 3])), {
      contentType: "image/png",
      size: 3,
    });
    expect([...objects.objects.get("k")!.bytes]).toEqual([1, 2, 3]);
    await objects.delete("k");
    expect(objects.objects.has("k")).toBe(false);
  });
});
