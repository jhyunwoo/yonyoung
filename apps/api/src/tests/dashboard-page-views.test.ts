import { describe, expect, it, vi } from "vitest";
import {
  type DashboardPageViewStatsEntity,
  type PageViewAnalyticsEntity,
  type PageViewAnalyticsRange,
} from "../lib/services/types";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  readJson,
} from "./test-helpers";

describe("Dashboard Page View Stats API", () => {
  it("관리자는 대시보드 통계를 조회할 수 있다", async () => {
    const mockStats: DashboardPageViewStatsEntity = {
      today: { count: 10, prevCount: 5 },
      thisWeek: { count: 50, prevCount: 40 },
      dailyTrend: [{ date: "2026-05-16", count: 10 }],
    };

    const getDashboardPageViewStats = vi.fn(async () => mockStats);
    const dataService = createDataServiceMock({ getDashboardPageViewStats });
    
    const app = createTestApp({
      actor: createActor("president", "admin-id"),
      dataService,
    });

    const response = await app.request("/api/admin/page-views/dashboard");
    expect(response.status).toBe(200);

    const body = await readJson<{ data: DashboardPageViewStatsEntity }>(response);
    expect(body.data).toEqual(mockStats);
    expect(getDashboardPageViewStats).toHaveBeenCalled();
  });

  it("미승인 사용자는 대시보드 통계를 조회할 수 없다", async () => {
    const app = createTestApp({
      actor: createActor("unverified", "user-id"),
      dataService: createDataServiceMock(),
    });

    const response = await app.request("/api/admin/page-views/dashboard");
    expect(response.status).toBe(403);
  });

  it("비로그인 사용자는 대시보드 통계를 조회할 수 없다", async () => {
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock(),
    });

    const response = await app.request("/api/admin/page-views/dashboard");
    expect(response.status).toBe(401);
  });

  it.each(["new_member", "associate_member", "regular_member"] as const)(
    "일반 회원 역할 %s도 대시보드 방문 통계를 조회할 수 있다",
    async (role) => {
      const getDashboardPageViewStats = vi.fn(async () => ({
        today: { count: 0, prevCount: 0 },
        thisWeek: { count: 0, prevCount: 0 },
        dailyTrend: [],
      }));
      const app = createTestApp({
        actor: createActor(role, IDs.member),
        dataService: createDataServiceMock({ getDashboardPageViewStats }),
      });

      const response = await app.request("/api/admin/page-views/dashboard");

      expect(response.status).toBe(200);
      expect(getDashboardPageViewStats).toHaveBeenCalled();
    },
  );

  describe("GET /api/admin/page-views/analytics", () => {
    const emptyAnalytics: PageViewAnalyticsEntity = {
      range: { from: "2026-10-01", to: "2026-10-07", days: 7, granularity: "day" },
      previousRange: { from: "2026-09-24", to: "2026-09-30" },
      summary: {
        totalViews: 0,
        prevTotalViews: 0,
        dailyAverage: 0,
        peak: null,
        entries: 0,
        prevEntries: 0,
      },
      trend: [],
      byPageType: [],
      topActivities: [],
      topExhibitions: [],
      weekdays: [],
      referrers: [],
      devices: [],
      entriesTrackedSince: null,
    };

    it("요청한 기간을 해석해 데이터 서비스에 넘긴다", async () => {
      const getPageViewAnalytics = vi.fn(async (_range: PageViewAnalyticsRange) => emptyAnalytics);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({ getPageViewAnalytics }),
      });

      const response = await app.request(
        "/api/admin/page-views/analytics?from=2026-10-01&to=2026-10-07&granularity=week",
      );

      expect(response.status).toBe(200);
      const body = await readJson<{ data: PageViewAnalyticsEntity }>(response);
      expect(body.data).toEqual(emptyAnalytics);
      expect(getPageViewAnalytics).toHaveBeenCalledWith({
        from: "2026-10-01",
        to: "2026-10-07",
        days: 7,
        granularity: "week",
        previous: { from: "2026-09-24", to: "2026-09-30" },
      });
    });

    it.each([
      "from=2026-10-07&to=2026-10-01",
      "from=2026-1-01",
      "granularity=year",
    ])("잘못된 쿼리 %s 는 400이다", async (query) => {
      const app = createTestApp({
        actor: createActor("president", "admin-id"),
        dataService: createDataServiceMock({ getPageViewAnalytics: vi.fn() }),
      });

      const response = await app.request(`/api/admin/page-views/analytics?${query}`);
      expect(response.status).toBe(400);
    });

    it("미승인 사용자는 403, 비로그인 사용자는 401이다", async () => {
      const unverified = createTestApp({
        actor: createActor("unverified", "user-id"),
        dataService: createDataServiceMock(),
      });
      const anonymous = createTestApp({
        actor: null,
        dataService: createDataServiceMock(),
      });

      expect((await unverified.request("/api/admin/page-views/analytics")).status).toBe(403);
      expect((await anonymous.request("/api/admin/page-views/analytics")).status).toBe(401);
    });
  });
});
