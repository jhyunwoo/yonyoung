import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./http", /** vi.mock 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => ({
  adminRequest: vi.fn(),
}));

import { adminRequest } from "./http";
import { adminResourceApi } from "./resources";

describe("adminResourceApi", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  const mockAdminRequest = vi.mocked(adminRequest);

  beforeEach(/** beforeEach 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    mockAdminRequest.mockReset();
    mockAdminRequest.mockResolvedValue(undefined as never);
  });

  const scenarios: Array<{
    name: string;
    invoke: () => Promise<unknown>;
    expectedPath: string;
    expectedMethod: "GET" | "POST" | "PATCH" | "DELETE";
    expectedBody?: unknown;
  }> = [
    {
      name: "listGenerations",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listGenerations(),
      expectedPath: "/generations",
      expectedMethod: "GET",
    },
    {
      name: "createGeneration",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.createGeneration({
          name: "10기",
          sortOrder: 10,
          startDate: 1,
          endDate: 2,
        }),
      expectedPath: "/generations",
      expectedMethod: "POST",
      expectedBody: { name: "10기", sortOrder: 10, startDate: 1, endDate: 2 },
    },
    {
      name: "getGenerationById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getGenerationById("g1"),
      expectedPath: "/generations/g1",
      expectedMethod: "GET",
    },
    {
      name: "updateGeneration",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateGeneration("g1", { name: "updated" }),
      expectedPath: "/generations/g1",
      expectedMethod: "PATCH",
      expectedBody: { name: "updated" },
    },
    {
      name: "deleteGeneration",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteGeneration("g1"),
      expectedPath: "/generations/g1",
      expectedMethod: "DELETE",
    },
    {
      name: "listActivities",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listActivities(),
      expectedPath: "/activities",
      expectedMethod: "GET",
    },
    {
      name: "createActivity",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.createActivity({
          title: "activity",
          description: "desc",
          activityDate: 1,
          coverImageUrl: "https://example.com/a.jpg",
          generationId: "gen",
        }),
      expectedPath: "/activities",
      expectedMethod: "POST",
      expectedBody: {
        title: "activity",
        description: "desc",
        activityDate: 1,
        coverImageUrl: "https://example.com/a.jpg",
        generationId: "gen",
      },
    },
    {
      name: "getActivityById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getActivityById("a1"),
      expectedPath: "/activities/a1",
      expectedMethod: "GET",
    },
    {
      name: "updateActivity",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateActivity("a1", { title: "updated" }),
      expectedPath: "/activities/a1",
      expectedMethod: "PATCH",
      expectedBody: { title: "updated" },
    },
    {
      name: "deleteActivity",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteActivity("a1"),
      expectedPath: "/activities/a1",
      expectedMethod: "DELETE",
    },
    {
      name: "addActivityImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.addActivityImage("a1", {
          imageUrl: "https://example.com/detail.jpg",
          sortOrder: 0,
        }),
      expectedPath: "/activities/a1/images",
      expectedMethod: "POST",
      expectedBody: { imageUrl: "https://example.com/detail.jpg", sortOrder: 0 },
    },
    {
      name: "updateActivityImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateActivityImage("a1", "i1", { sortOrder: 1 }),
      expectedPath: "/activities/a1/images/i1",
      expectedMethod: "PATCH",
      expectedBody: { sortOrder: 1 },
    },
    {
      name: "deleteActivityImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteActivityImage("a1", "i1"),
      expectedPath: "/activities/a1/images/i1",
      expectedMethod: "DELETE",
    },
    {
      name: "listSupporters",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listSupporters(),
      expectedPath: "/supporters",
      expectedMethod: "GET",
    },
    {
      name: "createSupporter",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.createSupporter({
          name: "supporter",
          link: "https://example.com",
          logoUrl: "https://example.com/logo.jpg",
          expiresAt: 1,
        }),
      expectedPath: "/supporters",
      expectedMethod: "POST",
      expectedBody: {
        name: "supporter",
        link: "https://example.com",
        logoUrl: "https://example.com/logo.jpg",
        expiresAt: 1,
      },
    },
    {
      name: "getSupporterById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getSupporterById("s1"),
      expectedPath: "/supporters/s1",
      expectedMethod: "GET",
    },
    {
      name: "updateSupporter",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateSupporter("s1", { name: "updated" }),
      expectedPath: "/supporters/s1",
      expectedMethod: "PATCH",
      expectedBody: { name: "updated" },
    },
    {
      name: "deleteSupporter",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteSupporter("s1"),
      expectedPath: "/supporters/s1",
      expectedMethod: "DELETE",
    },
    {
      name: "listExhibitions",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listExhibitions(),
      expectedPath: "/exhibitions",
      expectedMethod: "GET",
    },
    {
      name: "createExhibition",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.createExhibition({
          title: "exhibition",
          startDate: 1,
          endDate: 2,
          generationId: "gen",
          place: "place",
          coverImageUrl: "https://example.com/cover.jpg",
          description: "desc",
        }),
      expectedPath: "/exhibitions",
      expectedMethod: "POST",
      expectedBody: {
        title: "exhibition",
        startDate: 1,
        endDate: 2,
        generationId: "gen",
        place: "place",
        coverImageUrl: "https://example.com/cover.jpg",
        description: "desc",
      },
    },
    {
      name: "getExhibitionById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getExhibitionById("e1"),
      expectedPath: "/exhibitions/e1",
      expectedMethod: "GET",
    },
    {
      name: "updateExhibition",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateExhibition("e1", { title: "updated" }),
      expectedPath: "/exhibitions/e1",
      expectedMethod: "PATCH",
      expectedBody: { title: "updated" },
    },
    {
      name: "deleteExhibition",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteExhibition("e1"),
      expectedPath: "/exhibitions/e1",
      expectedMethod: "DELETE",
    },
    {
      name: "addExhibitionImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.addExhibitionImage("e1", {
          imageUrl: "https://example.com/detail.jpg",
          sortOrder: 0,
        }),
      expectedPath: "/exhibitions/e1/images",
      expectedMethod: "POST",
      expectedBody: { imageUrl: "https://example.com/detail.jpg", sortOrder: 0 },
    },
    {
      name: "updateExhibitionImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.updateExhibitionImage("e1", "i1", { sortOrder: 1 }),
      expectedPath: "/exhibitions/e1/images/i1",
      expectedMethod: "PATCH",
      expectedBody: { sortOrder: 1 },
    },
    {
      name: "deleteExhibitionImage",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteExhibitionImage("e1", "i1"),
      expectedPath: "/exhibitions/e1/images/i1",
      expectedMethod: "DELETE",
    },
    {
      name: "listLinktrees",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listLinktrees(),
      expectedPath: "/linktree",
      expectedMethod: "GET",
    },
    {
      name: "createLinktree",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.createLinktree({ name: "linktree" }),
      expectedPath: "/linktree",
      expectedMethod: "POST",
      expectedBody: { name: "linktree" },
    },
    {
      name: "getLinktreeById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getLinktreeById("l1"),
      expectedPath: "/linktree/l1",
      expectedMethod: "GET",
    },
    {
      name: "updateLinktree",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateLinktree("l1", { name: "updated" }),
      expectedPath: "/linktree/l1",
      expectedMethod: "PATCH",
      expectedBody: { name: "updated" },
    },
    {
      name: "deleteLinktree",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteLinktree("l1"),
      expectedPath: "/linktree/l1",
      expectedMethod: "DELETE",
    },
    {
      name: "addLinktreeItem",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.addLinktreeItem("l1", {
          name: "item",
          link: "https://example.com/item",
        }),
      expectedPath: "/linktree/l1/items",
      expectedMethod: "POST",
      expectedBody: { name: "item", link: "https://example.com/item" },
    },
    {
      name: "updateLinktreeItem",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () =>
        adminResourceApi.updateLinktreeItem("l1", "i1", {
          name: "updated",
        }),
      expectedPath: "/linktree/l1/items/i1",
      expectedMethod: "PATCH",
      expectedBody: { name: "updated" },
    },
    {
      name: "deleteLinktreeItem",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteLinktreeItem("l1", "i1"),
      expectedPath: "/linktree/l1/items/i1",
      expectedMethod: "DELETE",
    },
    {
      name: "listUsers",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.listUsers(),
      expectedPath: "/users",
      expectedMethod: "GET",
    },
    {
      name: "getUserById",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.getUserById("u1"),
      expectedPath: "/users/u1",
      expectedMethod: "GET",
    },
    {
      name: "updateUser",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.updateUser("u1", { role: "manager" }),
      expectedPath: "/users/u1",
      expectedMethod: "PATCH",
      expectedBody: { role: "manager" },
    },
    {
      name: "deleteUser",
            /**
       * invoke의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      invoke: () => adminResourceApi.deleteUser("u1"),
      expectedPath: "/users/u1",
      expectedMethod: "DELETE",
    },
  ];

  for (const scenario of scenarios) {
    it(`${scenario.name} should call adminRequest with expected arguments`, /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
      await scenario.invoke();

      expect(mockAdminRequest).toHaveBeenCalledTimes(1);
      const [path, method, body] = mockAdminRequest.mock.calls[0] as [
        string,
        "GET" | "POST" | "PATCH" | "DELETE",
        unknown,
      ];

      expect(path).toBe(scenario.expectedPath);
      expect(method).toBe(scenario.expectedMethod);

      if (scenario.expectedBody === undefined) {
        expect(body).toBeUndefined();
      } else {
        expect(body).toEqual(scenario.expectedBody);
      }
    });
  }
});
