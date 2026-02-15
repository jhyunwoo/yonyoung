import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  createUser,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("user routes additional coverage", () => {
  it("admin 권한 사용자는 users 목록 전체 조회가 가능하다", async () => {
    const listUsers = fn(async () => [
      createUser({ id: IDs.member, role: "regular_member" }),
      createUser({ id: IDs.manager, role: "manager" }),
    ]);
    const getUserById = fn(async () => createUser({ id: IDs.vicePresident }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ listUsers, getUserById }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: Array<{ id: string }> }>(response);
    expect(body.data).toHaveLength(2);
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(getUserById).not.toHaveBeenCalled();
  });

  it("member 계열 사용자의 본인 조회(list users fallback)에서 본인이 없으면 404", async () => {
    const getUserById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      dataService: createDataServiceMock({ getUserById }),
    });

    const response = await app.request("/api/users");
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(getUserById).toHaveBeenCalledWith(IDs.member);
  });

  it("member 계열 사용자의 본인 상세 조회 대상이 없으면 404", async () => {
    const getUserById = fn(async () => null);
    const app = createTestApp({
      actor: createActor("associate_member", IDs.member),
      dataService: createDataServiceMock({ getUserById }),
    });

    const response = await app.request(`/api/users/${IDs.member}`);
    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("admin 사용자 수정 본문이 비어 있으면 400", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.otherUser, role: "regular_member" })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin 사용자 수정 대상이 없으면 404", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => null),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "updated" }),
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin은 다른 사용자를 삭제할 수 있다", async () => {
    const deleteUser = fn(async () => true);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteUser }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith(IDs.otherUser);
  });

  it("삭제 대상 사용자가 없으면 404", async () => {
    const deleteUser = fn(async () => false);
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({ deleteUser }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(404);
    await expectErrorCode(response, "NOT_FOUND");
  });

  it("member 계열 사용자는 타인 계정을 삭제할 수 없다", async () => {
    const deleteUser = fn(async () => true);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({ deleteUser }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(403);
    await expectErrorCode(response, "FORBIDDEN");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("admin 사용자 수정 role이 enum 외 값이면 400", async () => {
    const updateUser = fn(async () => createUser({ id: IDs.otherUser }));
    const app = createTestApp({
      actor: createActor("vice_president", IDs.vicePresident),
      dataService: createDataServiceMock({
        getUserById: fn(async () => createUser({ id: IDs.otherUser })),
        updateUser,
      }),
    });

    const response = await app.request(`/api/users/${IDs.otherUser}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });

    expect(response.status).toBe(400);
    await expectErrorCode(response, "BAD_REQUEST");
    expect(updateUser).not.toHaveBeenCalled();
  });
});
