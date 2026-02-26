import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_CACHE_TAGS } from "../admin-cache";

vi.mock("./http", () => ({
  adminRequest: vi.fn(),
}));

import { adminRequest } from "./http";
import { adminResourceApi } from "./resources";

describe("adminResourceApi", () => {
  const adminRequestMock = vi.mocked(adminRequest);

  beforeEach(() => {
    vi.restoreAllMocks();
    adminRequestMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("활동 목록은 generationId 쿼리를 선택적으로 전달한다", async () => {
    adminRequestMock.mockResolvedValueOnce([]);
    await adminResourceApi.listActivities();
    expect(adminRequestMock).toHaveBeenNthCalledWith(1, "/activities", "GET");

    adminRequestMock.mockResolvedValueOnce([]);
    await adminResourceApi.listActivities({ generationId: "gen-1" });
    expect(adminRequestMock).toHaveBeenNthCalledWith(
      2,
      "/activities?generationId=gen-1",
      "GET",
    );
  });

  it("전시 목록도 generationId 쿼리를 선택적으로 전달한다", async () => {
    adminRequestMock.mockResolvedValueOnce([]);
    await adminResourceApi.listExhibitions();
    expect(adminRequestMock).toHaveBeenNthCalledWith(1, "/exhibitions", "GET");

    adminRequestMock.mockResolvedValueOnce([]);
    await adminResourceApi.listExhibitions({ generationId: "gen-2" });
    expect(adminRequestMock).toHaveBeenNthCalledWith(
      2,
      "/exhibitions?generationId=gen-2",
      "GET",
    );
  });

  it("조회 메서드는 리소스 경로에 맞는 GET 요청을 보낸다", async () => {
    adminRequestMock.mockResolvedValue({});

    await adminResourceApi.listGenerations();
    expect(adminRequestMock).toHaveBeenLastCalledWith("/generations", "GET");

    await adminResourceApi.getGenerationById("gen-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/generations/gen-1", "GET");

    await adminResourceApi.listGenerationMembers("gen-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith(
      "/generations/gen-1/members",
      "GET",
    );

    await adminResourceApi.getActivityById("act-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/activities/act-1", "GET");

    await adminResourceApi.listSupporters();
    expect(adminRequestMock).toHaveBeenLastCalledWith("/supporters", "GET");

    await adminResourceApi.getSupporterById("sup-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/supporters/sup-1", "GET");

    await adminResourceApi.getExhibitionById("exh-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/exhibitions/exh-1", "GET");

    await adminResourceApi.listLinktrees();
    expect(adminRequestMock).toHaveBeenLastCalledWith("/linktree", "GET");

    await adminResourceApi.getLinktreeById("link-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/linktree/link-1", "GET");

    await adminResourceApi.listGenerationNotices("gen-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith(
      "/generations/gen-1/notices",
      "GET",
    );

    await adminResourceApi.getGenerationNoticeById("gen-1", "notice-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith(
      "/generations/gen-1/notices/notice-1",
      "GET",
    );

    await adminResourceApi.listGlobalNotices();
    expect(adminRequestMock).toHaveBeenLastCalledWith("/global-notices", "GET");

    await adminResourceApi.getGlobalNoticeById("global-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith(
      "/global-notices/global-1",
      "GET",
    );

    await adminResourceApi.listUsers();
    expect(adminRequestMock).toHaveBeenLastCalledWith("/users", "GET");

    await adminResourceApi.getUserById("user-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith("/users/user-1", "GET");

    await adminResourceApi.getUserResourceHistory("user-1");
    expect(adminRequestMock).toHaveBeenLastCalledWith(
      "/users/user-1/resource-history?limit=100",
      "GET",
    );
  });

  it("감사 로그 조회는 limit를 1~100 범위로 보정하고 resourceId를 인코딩한다", async () => {
    adminRequestMock.mockResolvedValue([]);

    await adminResourceApi.listAuditLogs("activity", "resource with space", 999);
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/audit/activity/resource%20with%20space?limit=100",
      "GET",
    );

    await adminResourceApi.listAuditLogs("activity", "raw", 0);
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/audit/activity/raw?limit=1",
      "GET",
    );
  });

  it("사용자 리소스 이력 조회는 limit를 1~100 범위로 보정한다", async () => {
    adminRequestMock.mockResolvedValue({ items: [] });

    await adminResourceApi.getUserResourceHistory("user-1", 999);
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/users/user-1/resource-history?limit=100",
      "GET",
    );

    await adminResourceApi.getUserResourceHistory("user-1", 0);
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/users/user-1/resource-history?limit=1",
      "GET",
    );
  });

  it("변이 요청 성공 시 관리자 캐시 재검증을 호출한다", async () => {
    adminRequestMock.mockResolvedValueOnce({ id: "activity-1" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await adminResourceApi.createActivity({ title: "활동" } as unknown as never);

    expect(adminRequestMock).toHaveBeenCalledWith(
      "/activities",
      "POST",
      expect.objectContaining({ title: "활동" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/admin/revalidate",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.body).toBe(
      JSON.stringify({ tags: [ADMIN_CACHE_TAGS.activities] }),
    );
  });

  it("재검증 호출이 실패해도 변이 결과는 반환한다", async () => {
    adminRequestMock.mockResolvedValueOnce(undefined);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await expect(adminResourceApi.deleteActivity("activity-1")).resolves.toBeUndefined();
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/activities/activity-1",
      "DELETE",
    );
  });

  it("변이 메서드는 올바른 경로/메서드로 호출되고 기대한 캐시 태그를 재검증한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    const cases = [
      {
        invoke: () => adminResourceApi.createGeneration({ name: "60기" } as unknown as never),
        path: "/generations",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
        body: expect.objectContaining({ name: "60기" }),
      },
      {
        invoke: () =>
          adminResourceApi.updateGeneration("gen-1", { name: "61기" } as unknown as never),
        path: "/generations/gen-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
        body: expect.objectContaining({ name: "61기" }),
      },
      {
        invoke: () => adminResourceApi.deleteGeneration("gen-1"),
        path: "/generations/gen-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
      },
      {
        invoke: () => adminResourceApi.createActivity({ title: "활동" } as unknown as never),
        path: "/activities",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.activities],
        body: expect.objectContaining({ title: "활동" }),
      },
      {
        invoke: () =>
          adminResourceApi.updateActivity("act-1", { title: "수정 활동" } as unknown as never),
        path: "/activities/act-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.activities],
        body: expect.objectContaining({ title: "수정 활동" }),
      },
      {
        invoke: () => adminResourceApi.deleteActivity("act-1"),
        path: "/activities/act-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.activities],
      },
      {
        invoke: () =>
          adminResourceApi.addActivityImage(
            "act-1",
            { imageUrl: "https://example.com/a.jpg" } as unknown as never,
          ),
        path: "/activities/act-1/images",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.activities],
        body: expect.objectContaining({ imageUrl: "https://example.com/a.jpg" }),
      },
      {
        invoke: () =>
          adminResourceApi.addActivityImages(
            "act-1",
            [{ imageUrl: "https://example.com/a1.jpg" } as unknown as never],
          ),
        path: "/activities/act-1/images/batch",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.activities],
      },
      {
        invoke: () =>
          adminResourceApi.updateActivityImage(
            "act-1",
            "img-1",
            { imageUrl: "https://example.com/a2.jpg" } as unknown as never,
          ),
        path: "/activities/act-1/images/img-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.activities],
      },
      {
        invoke: () =>
          adminResourceApi.updateActivityImages(
            "act-1",
            [{ imageId: "img-1", imageUrl: "https://example.com/a3.jpg" } as unknown as never],
          ),
        path: "/activities/act-1/images/batch",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.activities],
      },
      {
        invoke: () => adminResourceApi.deleteActivityImage("act-1", "img-1"),
        path: "/activities/act-1/images/img-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.activities],
      },
      {
        invoke: () => adminResourceApi.createSupporter({ name: "스폰서" } as unknown as never),
        path: "/supporters",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.supporters],
      },
      {
        invoke: () =>
          adminResourceApi.updateSupporter(
            "sup-1",
            { name: "스폰서 수정" } as unknown as never,
          ),
        path: "/supporters/sup-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.supporters],
      },
      {
        invoke: () => adminResourceApi.deleteSupporter("sup-1"),
        path: "/supporters/sup-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.supporters],
      },
      {
        invoke: () => adminResourceApi.createExhibition({ title: "전시" } as unknown as never),
        path: "/exhibitions",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () =>
          adminResourceApi.updateExhibition(
            "exh-1",
            { title: "전시 수정" } as unknown as never,
          ),
        path: "/exhibitions/exh-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () => adminResourceApi.deleteExhibition("exh-1"),
        path: "/exhibitions/exh-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () =>
          adminResourceApi.addExhibitionImage(
            "exh-1",
            { imageUrl: "https://example.com/e.jpg" } as unknown as never,
          ),
        path: "/exhibitions/exh-1/images",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () =>
          adminResourceApi.addExhibitionImages(
            "exh-1",
            [{ imageUrl: "https://example.com/e1.jpg" } as unknown as never],
          ),
        path: "/exhibitions/exh-1/images/batch",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () =>
          adminResourceApi.updateExhibitionImage(
            "exh-1",
            "img-1",
            { imageUrl: "https://example.com/e2.jpg" } as unknown as never,
          ),
        path: "/exhibitions/exh-1/images/img-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () =>
          adminResourceApi.updateExhibitionImages(
            "exh-1",
            [{ imageId: "img-1", imageUrl: "https://example.com/e3.jpg" } as unknown as never],
          ),
        path: "/exhibitions/exh-1/images/batch",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () => adminResourceApi.deleteExhibitionImage("exh-1", "img-1"),
        path: "/exhibitions/exh-1/images/img-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.exhibitions],
      },
      {
        invoke: () => adminResourceApi.createLinktree({ name: "링크트리" } as unknown as never),
        path: "/linktree",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () =>
          adminResourceApi.updateLinktree(
            "link-1",
            { name: "링크트리 수정" } as unknown as never,
          ),
        path: "/linktree/link-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () => adminResourceApi.deleteLinktree("link-1"),
        path: "/linktree/link-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () =>
          adminResourceApi.addLinktreeItem(
            "link-1",
            { name: "인스타", link: "https://example.com" } as unknown as never,
          ),
        path: "/linktree/link-1/items",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () =>
          adminResourceApi.updateLinktreeItem(
            "link-1",
            "item-1",
            { name: "유튜브" } as unknown as never,
          ),
        path: "/linktree/link-1/items/item-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () => adminResourceApi.deleteLinktreeItem("link-1", "item-1"),
        path: "/linktree/link-1/items/item-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.linktree],
      },
      {
        invoke: () =>
          adminResourceApi.createGenerationNotice(
            "gen-1",
            { title: "기수 공지", content: "<p>본문</p>" } as unknown as never,
          ),
        path: "/generations/gen-1/notices",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () =>
          adminResourceApi.updateGenerationNotice(
            "gen-1",
            "notice-1",
            { title: "수정 공지" } as unknown as never,
          ),
        path: "/generations/gen-1/notices/notice-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () => adminResourceApi.deleteGenerationNotice("gen-1", "notice-1"),
        path: "/generations/gen-1/notices/notice-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () =>
          adminResourceApi.createGlobalNotice(
            { title: "전체 공지", content: "<p>본문</p>" } as unknown as never,
          ),
        path: "/global-notices",
        method: "POST",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () =>
          adminResourceApi.updateGlobalNotice(
            "global-1",
            { title: "수정 공지" } as unknown as never,
          ),
        path: "/global-notices/global-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () => adminResourceApi.deleteGlobalNotice("global-1"),
        path: "/global-notices/global-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.notices],
      },
      {
        invoke: () =>
          adminResourceApi.updateUser("user-1", { name: "수정 사용자" } as unknown as never),
        path: "/users/user-1",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.users, ADMIN_CACHE_TAGS.generations],
      },
      {
        invoke: () =>
          adminResourceApi.bulkUpdateUsersRole(
            { ids: ["user-1"], role: "manager" } as unknown as never,
          ),
        path: "/users/bulk-role",
        method: "PATCH",
        tags: [ADMIN_CACHE_TAGS.users, ADMIN_CACHE_TAGS.generations],
      },
      {
        invoke: () => adminResourceApi.deleteUser("user-1"),
        path: "/users/user-1",
        method: "DELETE",
        tags: [ADMIN_CACHE_TAGS.users, ADMIN_CACHE_TAGS.generations],
      },
    ] as const;

    for (const scenario of cases) {
      adminRequestMock.mockResolvedValueOnce({} as unknown as never);

      await scenario.invoke();

      const latestRequest = adminRequestMock.mock.calls.at(-1);
      expect(latestRequest?.[0]).toBe(scenario.path);
      expect(latestRequest?.[1]).toBe(scenario.method);
      if ("body" in scenario) {
        expect(latestRequest?.[2]).toEqual(scenario.body);
      } else if (scenario.method === "DELETE") {
        expect(latestRequest?.[2]).toBeUndefined();
      } else {
        expect(latestRequest?.[2]).toBeDefined();
      }

      const latestRevalidate = fetchSpy.mock.calls.at(-1);
      expect(latestRevalidate?.[0]).toBe("/api/admin/revalidate");
      const requestInit = latestRevalidate?.[1] as RequestInit;
      expect(requestInit.body).toBe(JSON.stringify({ tags: scenario.tags }));
    }
  });

  it("브라우저 환경이 아니면 재검증 요청을 생략한다", async () => {
    adminRequestMock.mockResolvedValueOnce({ id: "supporter-1" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.stubGlobal("window", undefined);

    await adminResourceApi.createSupporter({ name: "스폰서" } as unknown as never);

    expect(adminRequestMock).toHaveBeenCalledWith(
      "/supporters",
      "POST",
      expect.objectContaining({ name: "스폰서" }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("대시보드 통계는 유효한 generationSortOrder만 쿼리에 포함한다", async () => {
    adminRequestMock.mockResolvedValueOnce({} as unknown as never);
    await adminResourceApi.getAdminDashboardStats(5);
    expect(adminRequestMock).toHaveBeenCalledWith(
      "/admin/dashboard?generationSortOrder=5",
      "GET",
    );

    adminRequestMock.mockResolvedValueOnce({} as unknown as never);
    await adminResourceApi.getAdminDashboardStats(Number.NaN);
    expect(adminRequestMock).toHaveBeenCalledWith("/admin/dashboard", "GET");
  });
});
