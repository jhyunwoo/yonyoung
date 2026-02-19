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
  createUser,
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

  it("비로그인 접근 시 공개 활동 상세를 조회한다", async () => {
    const getActivityById = fn(async () =>
      createActivity({ id: IDs.activity, title: "활동 상세" }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/public/activities/${IDs.activity}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: { id: string; title: string } }>(response);
    expect(body.data.id).toBe(IDs.activity);
    expect(body.data.title).toBe("활동 상세");
    expect(getActivityById).toHaveBeenCalledWith(IDs.activity);
  });

  it("공개 활동 상세가 없으면 404를 반환한다", async () => {
    const getActivityById = fn(async () => null);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/public/activities/${IDs.activity}`);
    expect(response.status).toBe(404);
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

  it("비로그인 접근 시 공개 전시 상세를 조회한다", async () => {
    const getExhibitionById = fn(async () =>
      createExhibition({ id: IDs.exhibition, title: "전시 상세" }),
    );
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/public/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{ data: { id: string; title: string } }>(response);
    expect(body.data.id).toBe(IDs.exhibition);
    expect(body.data.title).toBe("전시 상세");
    expect(getExhibitionById).toHaveBeenCalledWith(IDs.exhibition);
  });

  it("공개 전시 상세가 없으면 404를 반환한다", async () => {
    const getExhibitionById = fn(async () => null);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ getExhibitionById }),
    });

    const response = await app.request(`/api/public/exhibitions/${IDs.exhibition}`);
    expect(response.status).toBe(404);
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

  it("공개 사진가 목록은 기수/멤버를 정렬해 반환하며 민감 정보를 노출하지 않는다", async () => {
    const listGenerations = fn(async () => [
      createGeneration({
        id: IDs.generationAlt,
        name: "20기",
        sortOrder: 20,
      }),
      createGeneration({
        id: IDs.generation,
        name: "10기",
        sortOrder: 10,
      }),
    ]);
    const listUsers = fn(async () => [
      createUser({
        id: IDs.otherUser,
        name: "zeta",
        familyName: "최",
        givenName: "연",
        generationId: IDs.generation,
        email: "private-1@example.com",
      }),
      createUser({
        id: IDs.member,
        name: "alpha",
        familyName: "김",
        givenName: "민수",
        generationId: IDs.generation,
        email: "private-2@example.com",
      }),
      createUser({
        id: IDs.manager,
        name: "beta",
        familyName: null,
        givenName: null,
        generationId: IDs.generationAlt,
        email: "private-3@example.com",
      }),
      createUser({
        id: IDs.vicePresident,
        name: "orphan",
        generationId: null,
      }),
    ]);

    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations, listUsers }),
    });

    const response = await app.request("/api/public/photographers");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");

    const body = await readJson<{
      data: Array<{
        id: string;
        members: Array<Record<string, unknown>>;
      }>;
    }>(response);

    expect(body.data.map((item) => item.id)).toEqual([
      IDs.generation,
      IDs.generationAlt,
    ]);
    expect(
      body.data[0]?.members.map((member) => member.id),
    ).toEqual([IDs.member, IDs.otherUser]);
    expect(body.data[1]?.members.map((member) => member.id)).toEqual([IDs.manager]);
    expect(body.data[0]?.members[0]).not.toHaveProperty("email");
    expect(body.data[0]?.members[0]).not.toHaveProperty("phoneNumber");
    expect(body.data[0]?.members[0]).not.toHaveProperty("studentNumber");
    expect(listGenerations).toHaveBeenCalledTimes(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
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
