import { describe, expect, it } from "vitest";
import {
  IDs,
  createActivity,
  createActivityImage,
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("activity routes", () => {
  it("member 계열 사용자는 활동 목록 조회가 가능하다", async () => {
    const listActivities = fn(async () => [createActivity()]);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ listActivities }),
    });

    const response = await app.request("/api/activities");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string; activityDate: number }> }>(
      response,
    );
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe(IDs.activity);
    expect(typeof body.data[0]?.activityDate).toBe("number");
  });

  it("member 계열 사용자는 활동 생성이 불가하다", async () => {
    const createActivityMock = fn(async () => createActivity());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ createActivity: createActivityMock }),
    });

    const response = await app.request("/api/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "활동",
        description: "설명",
        activityDate: Date.parse("2030-03-01T00:00:00.000Z"),
        coverImageUrl: "https://example.com/cover.jpg",
        generationId: IDs.generation,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it("활동 생성 본문이 잘못되면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request("/api/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "",
      }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("manager는 활동을 생성할 수 있다", async () => {
    const createActivityMock = fn(async () => createActivity({ title: "신규 활동" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ createActivity: createActivityMock }),
    });

    const payload = {
      title: "신규 활동",
      description: "설명",
      activityDate: Date.parse("2030-03-01T00:00:00.000Z"),
      coverImageUrl: "https://example.com/cover.jpg",
      generationId: IDs.generation,
    };

    const response = await app.request("/api/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("신규 활동");
    expect(createActivityMock).toHaveBeenCalledWith(payload);
  });

  it("활동 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("regular_member") });

    const response = await app.request("/api/activities/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 활동 상세 조회는 404를 반환한다", async () => {
    const getActivityById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getActivityById).toHaveBeenCalledWith(IDs.activity);
  });

  it("활동 수정 본문이 비어 있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 활동 수정은 404를 반환한다", async () => {
    const updateActivity = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 활동을 수정할 수 있다", async () => {
    const updateActivity = fn(async () => createActivity({ title: "수정" }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { title: string } }>(response);
    expect(body.data.title).toBe("수정");
  });

  it("member 계열 사용자는 활동 삭제가 불가하다", async () => {
    const deleteActivity = fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ deleteActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteActivity).not.toHaveBeenCalled();
  });

  it("존재하지 않는 활동 삭제는 404를 반환한다", async () => {
    const deleteActivity = fn(async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("manager는 활동을 삭제할 수 있다", async () => {
    const deleteActivity = fn(async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteActivity).toHaveBeenCalledWith(IDs.activity);
  });

  it("member 계열 사용자는 활동 상세 이미지를 추가할 수 없다", async () => {
    const addActivityImage = fn(async () => createActivityImage());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ addActivityImage }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/detail.jpg",
        sortOrder: 0,
      }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(addActivityImage).not.toHaveBeenCalled();
  });

  it("활동 상세 이미지 추가 본문이 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/activities/${IDs.activity}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "not-url" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("상위 활동이 없으면 상세 이미지 추가 시 404를 반환한다", async () => {
    const addActivityImage = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addActivityImage }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/detail.jpg",
        sortOrder: 0,
      }),
    });

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("활동");
  });

  it("manager는 활동 상세 이미지를 추가할 수 있다", async () => {
    const addActivityImage = fn(async () => createActivityImage());
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ addActivityImage }),
    });

    const payload = {
      imageUrl: "https://example.com/detail.jpg",
      sortOrder: 0,
    };

    const response = await app.request(`/api/activities/${IDs.activity}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.activityImage);
    expect(addActivityImage).toHaveBeenCalledWith(IDs.activity, payload);
  });

  it("활동 상세 이미지 수정 본문이 비어 있으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 활동 상세 이미지 수정은 404를 반환한다", async () => {
    const updateActivityImage = fn(async () => null);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateActivityImage }),
    });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 3 }),
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("세부 이미지");
  });

  it("manager는 활동 상세 이미지를 수정할 수 있다", async () => {
    const updateActivityImage = fn(async () => createActivityImage({ sortOrder: 3 }));
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ updateActivityImage }),
    });

    const payload = { sortOrder: 3 };
    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    expect(response.status).toBe(200);
    const body = await readJson<{ data: { sortOrder: number } }>(response);
    expect(body.data.sortOrder).toBe(3);
    expect(updateActivityImage).toHaveBeenCalledWith(
      IDs.activity,
      IDs.activityImage,
      payload,
    );
  });

  it("member 계열 사용자는 활동 상세 이미지 삭제가 불가하다", async () => {
    const deleteActivityImage = fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ deleteActivityImage }),
    });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteActivityImage).not.toHaveBeenCalled();
  });

  it("존재하지 않는 활동 상세 이미지 삭제는 404를 반환한다", async () => {
    const deleteActivityImage = fn(async () => false);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteActivityImage }),
    });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(404);
    const body = await readJson<{ error: { message: string } }>(response);
    expect(body.error.message).toContain("세부 이미지");
  });

  it("manager는 활동 상세 이미지를 삭제할 수 있다", async () => {
    const deleteActivityImage = fn(async () => true);
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({ deleteActivityImage }),
    });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "DELETE",
      },
    );

    expect(response.status).toBe(204);
    expect(deleteActivityImage).toHaveBeenCalledWith(IDs.activity, IDs.activityImage);
  });
});
