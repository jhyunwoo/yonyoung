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

describe("supporter routes", () => {
  it("인증되지 않은 요청은 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/supporters");

    expect(response.status).toBe(401);
    await expectErrorCode(response, "UNAUTHORIZED");
  });

  it("member 계열 사용자는 후원사 목록 조회가 가능하다", async () => {
    const listSupporters = fn(async () => [createSupporter()]);
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

  it("member 계열 사용자는 후원사를 생성할 수 없다", async () => {
    const createSupporterMock = fn(async () => createSupporter());
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

  it("후원사 생성 본문이 유효하지 않으면 400을 반환한다", async () => {
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

  it("manager는 후원사를 생성할 수 있다", async () => {
    const createSupporterMock = fn(async () => createSupporter({ name: "new-sponsor" }));
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

  it("후원사 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/supporters/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 후원사 상세 조회는 404를 반환한다", async () => {
    const getSupporterById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ getSupporterById }),
    });

    const response = await app.request(`/api/supporters/${IDs.supporter}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getSupporterById).toHaveBeenCalledWith(IDs.supporter);
  });

  it("후원사 수정 본문이 비어 있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/supporters/${IDs.supporter}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 후원사 수정은 404를 반환한다", async () => {
    const updateSupporter = fn(async () => null);
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

  it("manager는 후원사를 수정할 수 있다", async () => {
    const updateSupporter = fn(async () => createSupporter({ name: "updated" }));
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

  it("member 계열 사용자는 후원사 삭제 권한이 없다", async () => {
    const deleteSupporter = fn(async () => true);
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

  it("존재하지 않는 후원사 삭제는 404를 반환한다", async () => {
    const deleteSupporter = fn(async () => false);
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

  it("manager는 후원사를 삭제할 수 있다", async () => {
    const deleteSupporter = fn(async () => true);
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
});
