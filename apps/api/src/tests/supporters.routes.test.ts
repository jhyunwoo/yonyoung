import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createSupporter,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

const supporterWriteRoles = [
  { role: "president", actorId: IDs.president },
  { role: "vice_president", actorId: IDs.vicePresident },
  { role: "manager", actorId: IDs.manager },
] as const;

describe("supporter routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("인증되지 않은 요청은 401을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/supporters");

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("member 계열 사용자는 후원사 목록 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listSupporters = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [createSupporter()]);
    const app = createTestApp({
      actor: createActor("associate_member"),
      dataService: createDataServiceMock({ listSupporters }),
    });

    const response = await app.request("/api/supporters");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string; expiresAt: number }> }>(
      response,
    );
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.supporter);
    expect(typeof body.data[0]?.expiresAt).toBe("number");
  });

  it("member 계열 사용자는 후원사를 생성할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createSupporterMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createSupporter());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ createSupporter: createSupporterMock }),
    });

    const response = await app.request("/api/supporters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "sponsor",
        link: "https://example.com/sponsor",
        logoUrl: "https://example.com/logo.png",
        expiresAt: Date.parse("2031-01-01T00:00:00.000Z"),
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createSupporterMock).not.toHaveBeenCalled();
  });

  it("후원사 생성 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/supporters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "",
        link: "not-url",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 후원사를 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createSupporterMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createSupporter({ name: "new-sponsor" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createSupporter: createSupporterMock }),
    });

    const payload = {
      name: "new-sponsor",
      link: "https://example.com/sponsor",
      logoUrl: "https://example.com/logo.png",
      expiresAt: Date.parse("2031-01-01T00:00:00.000Z"),
    };
    const response = await app.request("/api/supporters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("new-sponsor");
    expect(createSupporterMock).toHaveBeenCalledWith(payload);
  });

  it("후원사 생성 시 공개 후원사 캐시를 무효화한다", async () => {
    const originalCaches = (globalThis as { caches?: unknown }).caches;
    const deleteMock = fn(async () => true);
    (globalThis as { caches?: unknown }).caches = {
      default: { delete: deleteMock },
    };

    try {
      const createSupporterMock = fn(async () => createSupporter({ name: "new-sponsor" }));
      const app = createTestApp({
        actor: createActor("manager", IDs.manager),
        dataService: createDataServiceMock({ createSupporter: createSupporterMock }),
      });

      await app.request("/api/supporters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "new-sponsor",
          link: "https://example.com/sponsor",
          logoUrl: "https://example.com/logo.png",
          expiresAt: Date.parse("2031-01-01T00:00:00.000Z"),
        }),
      });

      expect(deleteMock).toHaveBeenCalledTimes(1);
      const firstCall = deleteMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      const [request] = firstCall as unknown as [Request];
      expect(request).toBeInstanceOf(Request);
      expect(request.url).toContain("/api/public/supporters");
    } finally {
      (globalThis as { caches?: unknown }).caches = originalCaches;
    }
  });

  it("후원사 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/supporters/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 후원사 상세 조회는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getSupporterById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getSupporterById }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getSupporterById).toHaveBeenCalledWith(IDs.supporter);
  });

  it("후원사 상세 조회 성공 시 200을 반환한다", async () => {
    const getSupporterById = fn(async () => createSupporter({ id: IDs.supporter }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getSupporterById }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`);
    expect(response.status).toBe(200);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.supporter);
  });

  it("후원사 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 후원사 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateSupporter = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 후원사를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateSupporter = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createSupporter({ name: "updated" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { name: string } }>(response);
    expect(body.data.name).toBe("updated");
  });

  it.each(supporterWriteRoles)(
    "$role는 후원사를 수정할 수 있다",
    async ({ role, actorId }) => {
      const updateSupporter = fn(async () =>
        createSupporter({ name: `updated-${role}` }),
      );
      const app = createTestApp({
        actor: createActor(role, actorId),
        dataService: createDataServiceMock({ updateSupporter }),
      });

      const response = await app.request(`/api/supporters/${IDs.supporter}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: `updated-${role}` }),
      });

      expect(response.status).toBe(200);
      const body = await readJson<{ data: { name: string } }>(response);
      expect(body.data.name).toBe(`updated-${role}`);
      expect(updateSupporter).toHaveBeenCalledWith(IDs.supporter, {
        name: `updated-${role}`,
      });
    },
  );

  it("member 계열 사용자는 후원사 삭제 권한이 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteSupporter = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ deleteSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteSupporter).not.toHaveBeenCalled();
  });

  it("존재하지 않는 후원사 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteSupporter = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 후원사를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteSupporter = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteSupporter).toHaveBeenCalledWith(IDs.supporter);
  });

  it.each(supporterWriteRoles)(
    "$role는 후원사를 삭제할 수 있다",
    async ({ role, actorId }) => {
      const deleteSupporter = fn(async () => true);
      const app = createTestApp({
        actor: createActor(role, actorId),
        dataService: createDataServiceMock({ deleteSupporter }),
      });

      const response = await app.request(`/api/supporters/${IDs.supporter}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(204);
      expect(deleteSupporter).toHaveBeenCalledWith(IDs.supporter);
    },
  );

  it("인증되지 않은 요청은 후원사 관련 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/supporters" },
      {
        path: "/api/supporters",
        method: "POST",
        body: {
          name: "sponsor",
          link: "https://example.com/sponsor",
          logoUrl: "https://example.com/logo.png",
          expiresAt: Date.parse("2031-01-01T00:00:00.000Z"),
        },
      },
      { path: `/api/supporters/${IDs.supporter}` },
      {
        path: `/api/supporters/${IDs.supporter}`,
        method: "PATCH",
        body: { name: "updated" },
      },
      { path: `/api/supporters/${IDs.supporter}`, method: "DELETE" },
    ];

    for (const request of requests) {
      const response = await app.request(request.path, {
        method: request.method,
        headers: request.body ? { "content-type": "application/json" } : undefined,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      expect(response.status).toBe(401);
      await expectErrorCode(response, "UNAUTHORIZED");
    }
  });

  it("unverified 사용자는 후원사 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.otherUuid) });

    const listResponse = await app.request("/api/supporters");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/supporters/${IDs.supporter}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });

  it("후원사 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/supporters/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("후원사 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/supporters/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("member 계열 사용자는 후원사 수정 권한이 없어 403을 반환한다", async () => {
    const updateSupporter = fn(async () => createSupporter());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateSupporter }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateSupporter).not.toHaveBeenCalled();
  });

  it("후원사 수정 본문이 스키마와 맞지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ link: "invalid-url" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("후원사 수정 본문이 JSON이 아니면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Malformed");
  });
});
