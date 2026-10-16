import { describe, expect, it } from "vitest";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createTestApp,
  expectErrorCode,
  fn,
  readJson,
} from "./test-helpers";

describe("page-views routes", () => {
  describe("POST /api/public/page-views", () => {
    it("홈 방문을 기록할 수 있다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordPageView }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "home" }),
      });

      expect(response.status).toBe(200);
      const body = await readJson<{ ok: boolean }>(response);
      expect(body.ok).toBe(true);
      expect(recordPageView).toHaveBeenCalledWith("home", "home");
    });

    it("활동 방문을 기록할 수 있다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({ recordPageView }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "activity", resourceId: IDs.activity }),
      });

      expect(response.status).toBe(200);
      const body = await readJson<{ ok: boolean }>(response);
      expect(body.ok).toBe(true);
      expect(recordPageView).toHaveBeenCalledWith("activity", IDs.activity);
    });

    it("전시 방문을 기록할 수 있다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: createActor("regular_member", IDs.member),
        dataService: createDataServiceMock({ recordPageView }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType: "exhibition",
          resourceId: IDs.exhibition,
        }),
      });

      expect(response.status).toBe(200);
      const body = await readJson<{ ok: boolean }>(response);
      expect(body.ok).toBe(true);
      expect(recordPageView).toHaveBeenCalledWith("exhibition", IDs.exhibition);
    });

    it("인증 없이도 방문 기록이 가능하다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordPageView }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "home" }),
      });

      expect(response.status).toBe(200);
      expect(recordPageView).toHaveBeenCalled();
    });

    it("잘못된 pageType이면 400 에러를 반환한다", async () => {
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock(),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "invalid" }),
      });

      expect(response.status).toBe(400);
      await expectErrorCode(response, "BAD_REQUEST");
    });

    it("활동/전시는 유효한 UUID를 필수로 요구한다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordPageView }),
      });

      for (const payload of [
        { pageType: "activity" },
        { pageType: "exhibition", resourceId: "arbitrary-row-key" },
      ]) {
        const response = await app.request("/api/public/page-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        expect(response.status).toBe(400);
      }
      expect(recordPageView).not.toHaveBeenCalled();
    });

    it("존재하지 않거나 삭제된 리소스는 성공 응답만 반환하고 기록하지 않는다", async () => {
      const recordPageView = fn(async () => undefined);
      const recordView = fn(async () => undefined);
      const isActiveViewResource = fn(async () => false);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          isActiveViewResource,
          recordPageView,
        }),
        viewCountStore: {
          recordView,
          getViewCounts: async () => ({}),
        },
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType: "activity",
          resourceId: IDs.otherUuid,
        }),
      });

      expect(response.status).toBe(200);
      expect(isActiveViewResource).toHaveBeenCalledWith(
        "activity",
        IDs.otherUuid,
      );
      expect(recordPageView).not.toHaveBeenCalled();
      expect(recordView).not.toHaveBeenCalled();
    });

    it("singleton 페이지의 임의 resourceId는 고정 ID로 정규화한다", async () => {
      const recordPageView = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({ recordPageView }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "notice", resourceId: "random" }),
      });

      expect(response.status).toBe(200);
      expect(recordPageView).toHaveBeenCalledWith("notice", "notice");
    });

    it("rate limit을 초과하면 성공 응답을 유지하고 어떤 조회수도 기록하지 않는다", async () => {
      const recordPageView = fn(async () => undefined);
      const recordView = fn(async () => undefined);
      const isActiveViewResource = fn(async () => true);
      const app = createTestApp({
        actor: null,
        allowPageViewWrite: async () => false,
        dataService: createDataServiceMock({
          isActiveViewResource,
          recordPageView,
        }),
        viewCountStore: {
          recordView,
          getViewCounts: async () => ({}),
        },
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "home" }),
      });

      expect(response.status).toBe(200);
      expect(isActiveViewResource).not.toHaveBeenCalled();
      expect(recordPageView).not.toHaveBeenCalled();
      expect(recordView).not.toHaveBeenCalled();
    });

    it("진입이면 정규화한 유입 경로와 UA로 판별한 기기를 기록한다", async () => {
      const recordPageViewEntry = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: fn(async () => undefined),
          recordPageViewEntry,
        }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148",
        },
        body: JSON.stringify({ pageType: "home", entry: true, referrerHost: "WWW.Instagram.com" }),
      });

      expect(response.status).toBe(200);
      expect(recordPageViewEntry).toHaveBeenCalledWith({
        referrerHost: "instagram.com",
        device: "mobile",
      });
    });

    it("진입이 아니면 유입 경로를 기록하지 않는다", async () => {
      const recordPageViewEntry = fn(async () => undefined);
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: fn(async () => undefined),
          recordPageViewEntry,
        }),
      });

      await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "home", referrerHost: "instagram.com" }),
      });

      expect(recordPageViewEntry).not.toHaveBeenCalled();
    });

    it("진입 기록이 실패해도 200으로 응답한다", async () => {
      const app = createTestApp({
        actor: null,
        dataService: createDataServiceMock({
          recordPageView: fn(async () => undefined),
          recordPageViewEntry: fn(async () => {
            throw new Error("D1 down");
          }),
        }),
      });

      const response = await app.request("/api/public/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageType: "home", entry: true }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/admin/page-views/stats", () => {
    it("관리자는 방문 통계를 조회할 수 있다", async () => {
      const getPageViewStats = fn(async () => ({
        totalViews: 100,
        homeViews: 50,
        activityViews: 30,
        exhibitionViews: 20,
        noticeViews: 0,
        topActivities: [{ resourceId: "act-1", count: 10 }],
        topExhibitions: [{ resourceId: "exh-1", count: 5 }],
        dailyTrend: [{ date: "2030-01-01", count: 12 }],
      }));

      const app = createTestApp({
        actor: createActor("manager", IDs.manager),
        dataService: createDataServiceMock({ getPageViewStats }),
      });

      const response = await app.request("/api/admin/page-views/stats");
      expect(response.status).toBe(200);
      const body = await readJson<{
        data: {
          totalViews: number;
          homeViews: number;
          activityViews: number;
          exhibitionViews: number;
          topActivities: Array<{ resourceId: string; count: number }>;
          topExhibitions: Array<{ resourceId: string; count: number }>;
          dailyTrend: Array<{ date: string; count: number }>;
        };
      }>(response);
      expect(body.data.totalViews).toBe(100);
      expect(body.data.homeViews).toBe(50);
      expect(body.data.activityViews).toBe(30);
      expect(body.data.exhibitionViews).toBe(20);
      expect(body.data.topActivities).toEqual([
        { resourceId: "act-1", count: 10 },
      ]);
      expect(body.data.topExhibitions).toEqual([
        { resourceId: "exh-1", count: 5 },
      ]);
      expect(body.data.dailyTrend).toEqual([
        { date: "2030-01-01", count: 12 },
      ]);
      expect(getPageViewStats).toHaveBeenCalled();
    });

    it("인증되지 않은 사용자는 통계를 조회할 수 없다", async () => {
      const app = createTestApp({ actor: null });
      const response = await app.request("/api/admin/page-views/stats");
      expect(response.status).toBe(401);
      await expectErrorCode(response, "UNAUTHORIZED");
    });

    it("권한이 없는 사용자는 통계를 조회할 수 없다", async () => {
      const app = createTestApp({
        actor: createActor("unverified", IDs.member),
        dataService: createDataServiceMock(),
      });

      const response = await app.request("/api/admin/page-views/stats");
      expect(response.status).toBe(403);
      await expectErrorCode(response, "FORBIDDEN");
    });

    it.each(["new_member", "associate_member", "regular_member"] as const)(
      "일반 회원 역할 %s도 방문 통계를 조회할 수 있다",
      async (role) => {
        const getPageViewStats = fn(async () => ({
          totalViews: 0,
          homeViews: 0,
          activityViews: 0,
          exhibitionViews: 0,
          noticeViews: 0,
          topActivities: [],
          topExhibitions: [],
          dailyTrend: [],
        }));
        const app = createTestApp({
          actor: createActor(role, IDs.member),
          dataService: createDataServiceMock({ getPageViewStats }),
        });

        const response = await app.request("/api/admin/page-views/stats");

        expect(response.status).toBe(200);
        expect(getPageViewStats).toHaveBeenCalled();
      },
    );
  });

describe("방문자 이벤트 기록", () => {
  const VISIT = {
    visitorId: "11111111-1111-4111-8111-111111111111",
    sessionId: "22222222-2222-4222-8222-222222222222",
    pageviewId: "33333333-3333-4333-8333-333333333333",
  };
  const post = (
    app: ReturnType<typeof createTestApp>,
    body: unknown,
    userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile",
  ) =>
    app.request("/api/public/page-views", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": userAgent },
      body: JSON.stringify(body),
    });

  it("세션 첫 페이지뷰는 유입 경로·기기·회원 여부와 함께 이벤트로 남긴다", async () => {
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: createActor("regular_member", IDs.member),
      dataService: createDataServiceMock({
        recordPageView: async () => undefined,
        recordAnalyticsEvent,
      }),
    });

    await post(app, {
      pageType: "home",
      ...VISIT,
      sessionStart: true,
      sessionReferrerHost: "www.Google.com",
    });

    expect(recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: VISIT.pageviewId,
        visitorId: VISIT.visitorId,
        sessionId: VISIT.sessionId,
        pageType: "home",
        resourceId: "home",
        referrerHost: "google.com",
        device: "mobile",
        isMember: true,
      }),
    );
  });

  it("세션 중간 페이지뷰는 유입 경로를 비우고, 비로그인은 회원이 아니다", async () => {
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        recordPageView: async () => undefined,
        recordAnalyticsEvent,
      }),
    });

    await post(app, { pageType: "home", ...VISIT });

    expect(recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ referrerHost: null, isMember: false }),
    );
  });

  it("세션 시작인데 유입 경로가 없으면 직접 접속으로 남긴다", async () => {
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        recordPageView: async () => undefined,
        recordAnalyticsEvent,
      }),
    });

    await post(app, { pageType: "home", ...VISIT, sessionStart: true });

    expect(recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ referrerHost: "direct" }),
    );
  });

  it("ID가 없는 옛 클라이언트 요청은 합계만 기록하고 이벤트는 남기지 않는다", async () => {
    const recordPageView = fn(async () => undefined);
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        recordPageView,
        recordAnalyticsEvent,
      }),
    });

    const response = await post(app, {
      pageType: "home",
      visitorId: "not-a-uuid",
    });

    expect(response.status).toBe(200);
    expect(recordPageView).toHaveBeenCalledWith("home", "home");
    expect(recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("봇 UA는 이벤트를 남기지 않는다", async () => {
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({
        recordPageView: async () => undefined,
        recordAnalyticsEvent,
      }),
    });

    await post(
      app,
      { pageType: "home", ...VISIT },
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    );

    expect(recordAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("회원 확인이 실패해도 비회원으로 기록한다", async () => {
    const recordAnalyticsEvent = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      resolveActor: async () => {
        throw new Error("session lookup failed");
      },
      dataService: createDataServiceMock({
        recordPageView: async () => undefined,
        recordAnalyticsEvent,
      }),
    });

    await post(app, { pageType: "home", ...VISIT });

    expect(recordAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ isMember: false }),
    );
  });
});

describe("POST /api/public/page-views/engagement", () => {
  const BODY = {
    pageviewId: "33333333-3333-4333-8333-333333333333",
    visitorId: "11111111-1111-4111-8111-111111111111",
    engagedMs: 12_000,
  };
  const post = (app: ReturnType<typeof createTestApp>, body: unknown) =>
    app.request("/api/public/page-views/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("체류 시간을 기록한다", async () => {
    const recordEngagement = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ recordEngagement }),
    });

    const response = await post(app, BODY);

    expect(response.status).toBe(200);
    expect(recordEngagement).toHaveBeenCalledWith(
      expect.objectContaining({ ...BODY, nowMs: expect.any(Number) }),
    );
  });

  it("형식이 틀리면 400이다", async () => {
    const app = createTestApp({ actor: null });
    const response = await post(app, { ...BODY, engagedMs: -1 });
    await expectErrorCode(response, "BAD_REQUEST");
  });

  it("레이트리밋에 걸리면 기록하지 않고 200을 돌려준다", async () => {
    const recordEngagement = fn(async () => undefined);
    const app = createTestApp({
      actor: null,
      allowPageViewWrite: () => false,
      dataService: createDataServiceMock({ recordEngagement }),
    });

    const response = await post(app, BODY);

    expect(response.status).toBe(200);
    expect(recordEngagement).not.toHaveBeenCalled();
  });
});
});
