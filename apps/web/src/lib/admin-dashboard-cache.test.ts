import { beforeEach, describe, expect, it, vi } from "vitest";
const resolveAuthApiUrlMock = vi.fn(() => "https://api.example.com");

vi.mock("server-only", () => ({}));

vi.mock("./auth-server", () => ({
  resolveAuthApiUrl: () => resolveAuthApiUrlMock(),
}));

describe("admin-dashboard-cache", () => {
  beforeEach(() => {
    resolveAuthApiUrlMock.mockClear();
    vi.restoreAllMocks();
  });

  it("기수 활동 목록 조회 시 캐시 태그와 쿠키 헤더를 사용한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: "activity-1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { listCachedActivities } = await import("./admin-dashboard-cache");

    const rows = await listCachedActivities("generation-60", "a=b");

    expect(rows).toEqual([{ id: "activity-1" }]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/api/activities?generationId=generation-60");
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
    const headers = (init as RequestInit | undefined)?.headers as Headers | undefined;
    expect(headers?.get("Accept")).toBe("application/json");
    expect(headers?.get("cookie")).toBe("a=b");
  });

  it("기수 멤버 목록 조회 시 users, generations 태그를 함께 설정한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ id: "member-1" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { listCachedGenerationMembers } = await import("./admin-dashboard-cache");

    const rows = await listCachedGenerationMembers("generation-60", "a=b");

    expect(rows).toEqual([{ id: "member-1" }]);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/api/generations/generation-60/members");
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
    const headers = (init as RequestInit | undefined)?.headers as Headers | undefined;
    expect(headers?.get("Accept")).toBe("application/json");
    expect(headers?.get("cookie")).toBe("a=b");
  });

  it("조회 실패 시 빈 배열을 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));

    const { listCachedLinktrees } = await import("./admin-dashboard-cache");

    const rows = await listCachedLinktrees("a=b");

    expect(rows).toEqual([]);
  });
});
