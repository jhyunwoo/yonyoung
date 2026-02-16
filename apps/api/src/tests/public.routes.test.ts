import { describe, expect, it } from "vitest";
import {
  IDs,
  createActivity,
  createDataServiceMock,
  createExhibition,
  createGeneration,
  createLinktree,
  createSupporter,
  createTestApp,
  fn,
  readJson,
} from "./test-helpers";

describe("public routes", () => {
  it("비로그인 접근 시 공개 활동 목록을 최신 순으로 조회한다", async () => {
    const listActivities = fn(async () => [
      createActivity({
        id: "20000000-0000-4000-8000-000000000011",
        activityDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
      createActivity({
        id: "20000000-0000-4000-8000-000000000012",
        activityDate: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listActivities }),
    });

    const response = await app.request("/api/public/activities");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "20000000-0000-4000-8000-000000000012",
      "20000000-0000-4000-8000-000000000011",
    ]);
    expect(listActivities).toHaveBeenCalledTimes(1);
  });

  it("비로그인 접근 시 공개 전시 목록을 최신 시작일 순으로 조회한다", async () => {
    const listExhibitions = fn(async () => [
      createExhibition({
        id: "40000000-0000-4000-8000-000000000011",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
      }),
      createExhibition({
        id: "40000000-0000-4000-8000-000000000012",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listExhibitions }),
    });

    const response = await app.request("/api/public/exhibitions");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "40000000-0000-4000-8000-000000000012",
      "40000000-0000-4000-8000-000000000011",
    ]);
  });

  it("공개 후원사 목록은 유효한 후원사를 우선 노출한다", async () => {
    const listSupporters = fn(async () => [
      createSupporter({
        id: "30000000-0000-4000-8000-000000000011",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
      createSupporter({
        id: "30000000-0000-4000-8000-000000000012",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      }),
      createSupporter({
        id: "30000000-0000-4000-8000-000000000013",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listSupporters }),
    });

    const response = await app.request("/api/public/supporters");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data[0]?.id).toBe("30000000-0000-4000-8000-000000000013");
    expect(body.data[1]?.id).toBe("30000000-0000-4000-8000-000000000012");
    expect(body.data[2]?.id).toBe("30000000-0000-4000-8000-000000000011");
  });

  it("공개 링크트리는 비로그인 상태에서도 조회할 수 있다", async () => {
    const listLinktrees = fn(async () => [
      createLinktree({
        id: IDs.linktree,
        items: [
          {
            id: IDs.linktreeItem,
            linktreeId: IDs.linktree,
            name: "Instagram",
            link: "https://instagram.com/yonyoung",
          },
        ],
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listLinktrees }),
    });

    const response = await app.request("/api/public/linktree");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.linktree);
  });

  it("공개 기수 목록은 sortOrder 기준 오름차순으로 정렬된다", async () => {
    const listGenerations = fn(async () => [
      createGeneration({
        id: IDs.generationAlt,
        sortOrder: 20,
      }),
      createGeneration({
        id: IDs.generation,
        sortOrder: 10,
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations }),
    });

    const response = await app.request("/api/public/generations");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      IDs.generation,
      IDs.generationAlt,
    ]);
  });
});
