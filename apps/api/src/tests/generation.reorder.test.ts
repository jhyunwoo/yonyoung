import { describe, expect, it } from "vitest";
import { createGenerationRepository } from "../features/generations/generation.repository";
import { generations } from "../platform/db/schema";
import { createFakeDatabase } from "./support/fake-database";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

const GEN_A = "10000000-0000-4000-8000-00000000000a";
const GEN_B = "10000000-0000-4000-8000-00000000000b";
const GEN_C = "10000000-0000-4000-8000-00000000000c";

describe("generation repository reorder", () => {
  const createRepository = () => {
    const fake = createFakeDatabase();
    fake.queueSelect(generations, [
      { id: GEN_A, sortOrder: 58 },
      { id: GEN_B, sortOrder: 59 },
      { id: GEN_C, sortOrder: 60 },
    ]);
    return { fake, repository: createGenerationRepository(fake.db) };
  };

  it("두 기수의 자리를 한 트랜잭션에서 임시값 → 최종값 두 단계로 맞바꾼다", async () => {
    const { fake, repository } = createRepository();

    const result = await repository.reorderGenerations([
      { id: GEN_A, sortOrder: 59 },
      { id: GEN_B, sortOrder: 58 },
    ]);

    expect(result).toEqual({ status: "ok", changedIds: [GEN_A, GEN_B] });
    expect(fake.batches).toEqual([4]);
    const sortOrders = fake.updatesFor("generations").map((update) => update.values.sortOrder);
    // 1단계: 기존 값과 겹치지 않는 음수 임시값, 2단계: 최종값
    expect(sortOrders).toEqual([-1, -2, 59, 58]);
  });

  it("요청 밖의 기수가 이미 쓰는 순서로 옮기면 충돌로 거절하고 아무것도 쓰지 않는다", async () => {
    const { fake, repository } = createRepository();

    const result = await repository.reorderGenerations([{ id: GEN_A, sortOrder: 60 }]);

    expect(result).toEqual({ status: "conflict" });
    expect(fake.batches).toEqual([]);
  });

  it("없는 기수가 섞이면 not_found를 돌려준다", async () => {
    const { repository } = createRepository();

    await expect(
      repository.reorderGenerations([{ id: IDs.otherUuid, sortOrder: 1 }]),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("바뀌는 값이 없으면 쓰지 않는다", async () => {
    const { fake, repository } = createRepository();

    await expect(
      repository.reorderGenerations([{ id: GEN_A, sortOrder: 58 }]),
    ).resolves.toEqual({ status: "ok", changedIds: [] });
    expect(fake.batches).toEqual([]);
  });
});

describe("POST /api/generations/reorder", () => {
  const request = (app: ReturnType<typeof createTestApp>, body: unknown) =>
    app.request("/api/generations/reorder", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("회장은 기수 순서를 바꾸고 전체 목록과 감사 로그를 남긴다", async () => {
    const reorderGenerations = fn(async () => ({
      status: "ok" as const,
      changedIds: [GEN_A, GEN_B],
    }));
    const listGenerations = fn(async () => [
      createGeneration({ id: GEN_B, sortOrder: 58 }),
      createGeneration({ id: GEN_A, sortOrder: 59 }),
    ]);
    const createAuditLog = fn(async () => undefined);
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        reorderGenerations,
        listGenerations,
        createAuditLog,
      }),
    });

    const response = await request(app, {
      items: [
        { id: GEN_A, sortOrder: 59 },
        { id: GEN_B, sortOrder: 58 },
      ],
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((generation) => generation.id)).toEqual([GEN_B, GEN_A]);
    expect(createAuditLog).toHaveBeenCalledTimes(2);
  });

  it("충돌은 409, 없는 기수는 404로 알린다", async () => {
    const conflictApp = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        reorderGenerations: fn(async () => ({ status: "conflict" as const })),
      }),
    });
    const notFoundApp = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({
        reorderGenerations: fn(async () => ({ status: "not_found" as const })),
      }),
    });
    const body = { items: [{ id: GEN_A, sortOrder: 60 }] };

    const conflict = await request(conflictApp, body);
    expect(conflict.status).toBe(409);
    await expectErrorCode(conflict, "CONFLICT");
    expect((await request(notFoundApp, body)).status).toBe(404);
  });

  it("중복 id·중복 순서는 400으로 거절한다", async () => {
    const reorderGenerations = fn(async () => ({ status: "ok" as const, changedIds: [] }));
    const app = createTestApp({
      actor: createActor("president", IDs.president),
      dataService: createDataServiceMock({ reorderGenerations }),
    });

    const duplicatedOrder = await request(app, {
      items: [
        { id: GEN_A, sortOrder: 1 },
        { id: GEN_B, sortOrder: 1 },
      ],
    });

    expect(duplicatedOrder.status).toBe(400);
    expect(reorderGenerations).not.toHaveBeenCalled();
  });

  it("기수 수정 권한이 없으면 403이다", async () => {
    const reorderGenerations = fn(async () => ({ status: "ok" as const, changedIds: [] }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ reorderGenerations }),
    });

    const response = await request(app, { items: [{ id: GEN_A, sortOrder: 1 }] });

    expect(response.status).toBe(403);
    expect(reorderGenerations).not.toHaveBeenCalled();
  });
});
