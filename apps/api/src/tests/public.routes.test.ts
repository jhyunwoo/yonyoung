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
  it("비로그인 접근 시 공개 활동 목록을 조회한다", async () => {
    const listPublicActivities = fn(async () => [
      createActivity({
        id: "20000000-0000-4000-8000-000000000012",
        activityDate: new Date("2026-01-01T00:00:00.000Z"),
      }),
      createActivity({
        id: "20000000-0000-4000-8000-000000000011",
        activityDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicActivities }),
    });

    const response = await app.request("/api/public/activities");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "20000000-0000-4000-8000-000000000012",
      "20000000-0000-4000-8000-000000000011",
    ]);
    expect(listPublicActivities).toHaveBeenCalledTimes(1);
  });

  it("비로그인 접근 시 공개 전시 목록을 조회한다", async () => {
    const listPublicExhibitions = fn(async () => [
      createExhibition({
        id: "40000000-0000-4000-8000-000000000012",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
      }),
      createExhibition({
        id: "40000000-0000-4000-8000-000000000011",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicExhibitions }),
    });

    const response = await app.request("/api/public/exhibitions");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      "40000000-0000-4000-8000-000000000012",
      "40000000-0000-4000-8000-000000000011",
    ]);
    expect(listPublicExhibitions).toHaveBeenCalledTimes(1);
  });

  it("공개 후원사 목록은 서비스에서 계산한 우선순위를 그대로 반환한다", async () => {
    const listPublicSupporters = fn(async () => [
      createSupporter({
        id: "30000000-0000-4000-8000-000000000013",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
      createSupporter({
        id: "30000000-0000-4000-8000-000000000012",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      }),
      createSupporter({
        id: "30000000-0000-4000-8000-000000000011",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
    ]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listPublicSupporters }),
    });

    const response = await app.request("/api/public/supporters");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data[0]?.id).toBe("30000000-0000-4000-8000-000000000013");
    expect(body.data[1]?.id).toBe("30000000-0000-4000-8000-000000000012");
    expect(body.data[2]?.id).toBe("30000000-0000-4000-8000-000000000011");
    expect(listPublicSupporters).toHaveBeenCalledTimes(1);
    expect(listPublicSupporters).toHaveBeenCalledWith(expect.any(Number));
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
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

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
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data.map((item) => item.id)).toEqual([
      IDs.generation,
      IDs.generationAlt,
    ]);
  });

  it("공개 활동 목록은 cache hit 시 데이터 서비스를 재호출하지 않는다", async () => {
    const originalCaches = (globalThis as { caches?: unknown }).caches;
    const store = new Map<string, Response>();
    const match = fn(async (request: Request) => store.get(request.url)?.clone());
    const put = fn(async (request: Request, response: Response) => {
      store.set(request.url, response.clone());
    });
    (globalThis as { caches?: unknown }).caches = {
      default: { match, put },
    };

    try {
      const listPublicActivities = fn(async () => [createActivity()]);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ listPublicActivities }),
      });

      const firstResponse = await app.request("/api/public/activities");
      expect(firstResponse.status).toBe(200);
      expect(listPublicActivities).toHaveBeenCalledTimes(1);

      const secondResponse = await app.request("/api/public/activities");
      expect(secondResponse.status).toBe(200);
      expect(listPublicActivities).toHaveBeenCalledTimes(1);
      expect(match).toHaveBeenCalledTimes(2);
      expect(put).toHaveBeenCalledTimes(1);
    } finally {
      (globalThis as { caches?: unknown }).caches = originalCaches;
    }
  });
});
