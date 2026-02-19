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

describe("activity routes", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("member 계열 사용자는 활동 목록 조회가 가능하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const listActivities = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => [createActivity()]);
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

  it("member 계열 사용자는 활동 생성이 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createActivityMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivity());
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

  it("활동 생성 본문이 잘못되면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
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

  it("manager는 활동을 생성할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const createActivityMock = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivity({ title: "신규 활동" }));
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

  it("활동 상세 조회에서 UUID가 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("regular_member") });

    const response = await app.request("/api/activities/not-a-uuid");
    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 활동 상세 조회는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const getActivityById = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getActivityById).toHaveBeenCalledWith(IDs.activity);
  });

  it("활동 상세 조회 성공 시 200을 반환한다", async () => {
    const getActivityById = fn(async () => createActivity({ id: IDs.activity }));
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ getActivityById }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`);
    expect(response.status).toBe(200);
    const body = await readJson<{ data: { id: string } }>(response);
    expect(body.data.id).toBe(IDs.activity);
  });

  it("활동 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("존재하지 않는 활동 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateActivity = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
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

  it("manager는 활동을 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateActivity = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivity({ title: "수정" }));
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

  it("member 계열 사용자는 활동 삭제가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivity = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
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

  it("존재하지 않는 활동 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivity = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
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

  it("manager는 활동을 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivity = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
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

  it("member 계열 사용자는 활동 상세 이미지를 추가할 수 없다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivityImage());
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

  it("활동 상세 이미지 추가 본문이 유효하지 않으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const response = await app.request(`/api/activities/${IDs.activity}/images`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl: "not-url" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("상위 활동이 없으면 상세 이미지 추가 시 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
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

  it("manager는 활동 상세 이미지를 추가할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const addActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivityImage());
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

  it("활동 상세 이미지 수정 본문이 비어 있으면 400을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
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

  it("존재하지 않는 활동 상세 이미지 수정은 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => null);
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

  it("manager는 활동 상세 이미지를 수정할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const updateActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => createActivityImage({ sortOrder: 3 }));
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

  it("member 계열 사용자는 활동 상세 이미지 삭제가 불가하다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
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

  it("존재하지 않는 활동 상세 이미지 삭제는 404를 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => false);
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

  it("manager는 활동 상세 이미지를 삭제할 수 있다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const deleteActivityImage = fn(/** fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => true);
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

  it("인증되지 않은 요청은 활동 관련 엔드포인트에서 401을 반환한다", async () => {
    const app = createTestApp({ actor: null });
    const requests: Array<{
      path: string;
      method?: "POST" | "PATCH" | "DELETE";
      body?: unknown;
    }> = [
      { path: "/api/activities" },
      {
        path: "/api/activities",
        method: "POST",
        body: {
          title: "활동",
          description: "설명",
          activityDate: Date.parse("2030-03-01T00:00:00.000Z"),
          coverImageUrl: "https://example.com/cover.jpg",
          generationId: IDs.generation,
        },
      },
      { path: `/api/activities/${IDs.activity}` },
      {
        path: `/api/activities/${IDs.activity}`,
        method: "PATCH",
        body: { title: "수정" },
      },
      { path: `/api/activities/${IDs.activity}`, method: "DELETE" },
      {
        path: `/api/activities/${IDs.activity}/images`,
        method: "POST",
        body: { imageUrl: "https://example.com/detail.jpg", sortOrder: 0 },
      },
      {
        path: `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
        method: "PATCH",
        body: { sortOrder: 1 },
      },
      {
        path: `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
        method: "DELETE",
      },
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

  it("unverified 사용자는 활동 목록/상세 조회 권한이 없어 403을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("unverified", IDs.otherUser) });

    const listResponse = await app.request("/api/activities");
    expect(listResponse.status).toBe(403);
    await expectErrorCode(listResponse, "FORBIDDEN");

    const detailResponse = await app.request(`/api/activities/${IDs.activity}`);
    expect(detailResponse.status).toBe(403);
    await expectErrorCode(detailResponse, "FORBIDDEN");
  });

  it("활동 수정 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/activities/not-a-uuid", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("활동 삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });
    const response = await app.request("/api/activities/not-a-uuid", {
      method: "DELETE",
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("member 계열 사용자는 활동 수정 권한이 없어 403을 반환한다", async () => {
    const updateActivity = fn(async () => createActivity());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateActivity }),
    });

    const response = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "수정" }),
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateActivity).not.toHaveBeenCalled();
  });

  it("활동 상세 이미지 생성/수정/삭제 파라미터가 유효하지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const createResponse = await app.request("/api/activities/not-a-uuid/images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/detail.jpg",
        sortOrder: 0,
      }),
    });
    expect(createResponse.status).toBe(400);
    await expectErrorCode(createResponse, "BAD_REQUEST");

    const patchResponse = await app.request(
      `/api/activities/${IDs.activity}/images/not-a-uuid`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 1 }),
      },
    );
    expect(patchResponse.status).toBe(400);
    await expectErrorCode(patchResponse, "BAD_REQUEST");

    const deleteResponse = await app.request(
      `/api/activities/${IDs.activity}/images/not-a-uuid`,
      {
        method: "DELETE",
      },
    );
    expect(deleteResponse.status).toBe(400);
    await expectErrorCode(deleteResponse, "BAD_REQUEST");
  });

  it("member 계열 사용자는 활동 상세 이미지 수정 권한이 없어 403을 반환한다", async () => {
    const updateActivityImage = fn(async () => createActivityImage());
    const app = createTestApp({
      actor: createActor("regular_member"),
      dataService: createDataServiceMock({ updateActivityImage }),
    });

    const response = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sortOrder: 2 }),
      },
    );

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(updateActivityImage).not.toHaveBeenCalled();
  });

  it("활동/활동 이미지 수정 본문이 스키마와 맞지 않으면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activityDate: "invalid" }),
    });
    expect(updateResponse.status).toBe(400);
    await expectErrorCode(updateResponse, "BAD_REQUEST");

    const updateImageResponse = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: "invalid-url" }),
      },
    );
    expect(updateImageResponse.status).toBe(400);
    await expectErrorCode(updateImageResponse, "BAD_REQUEST");
  });

  it("활동/활동 이미지 수정 본문이 JSON이 아니면 400을 반환한다", async () => {
    const app = createTestApp({ actor: createActor("manager", IDs.manager) });

    const updateResponse = await app.request(`/api/activities/${IDs.activity}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(updateResponse.status).toBe(400);
    expect(await updateResponse.text()).toContain("Malformed");

    const updateImageResponse = await app.request(
      `/api/activities/${IDs.activity}/images/${IDs.activityImage}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{",
      },
    );
    expect(updateImageResponse.status).toBe(400);
    expect(await updateImageResponse.text()).toContain("Malformed");
  });
});
