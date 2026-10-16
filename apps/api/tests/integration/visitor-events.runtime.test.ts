import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createVisitorEventRepository } from "../../src/features/page-views/visitor-events.repository";
import createDB from "../../src/lib/db";

const db = env.db as D1Database;
const HOUR_MS = 60 * 60 * 1000;
const V1 = "11111111-1111-4111-8111-111111111111";
const S1 = "22222222-2222-4222-8222-222222222222";

const event = (id: string, visitedAt: number) => ({
  id,
  visitorId: V1,
  sessionId: S1,
  visitedAt,
  pageType: "home" as const,
  resourceId: "home",
  referrerHost: "direct",
  device: "desktop" as const,
  isMember: false,
});

const readEngaged = async (id: string) =>
  (
    await db
      .prepare("SELECT engaged_ms FROM analytics_events WHERE id = ?")
      .bind(id)
      .first<{ engaged_ms: number | null }>()
  )?.engaged_ms;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
});

describe("analytics_events 쓰기", () => {
  it("같은 pageviewId를 두 번 보내도 한 행만 남는다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("dup-1", now));
    await repository.recordAnalyticsEvent(event("dup-1", now));

    const row = await db
      .prepare("SELECT count(*) AS n FROM analytics_events WHERE id = 'dup-1'")
      .first<{ n: number }>();
    expect(row?.n).toBe(1);
  });

  it("체류 시간은 큰 값만 반영하고 30분으로 자른다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("eng-1", now));

    await repository.recordEngagement({
      pageviewId: "eng-1",
      visitorId: V1,
      engagedMs: 5000,
      nowMs: now,
    });
    await repository.recordEngagement({
      pageviewId: "eng-1",
      visitorId: V1,
      engagedMs: 3000,
      nowMs: now,
    });
    expect(await readEngaged("eng-1")).toBe(5000);

    await repository.recordEngagement({
      pageviewId: "eng-1",
      visitorId: V1,
      engagedMs: 99 * 60 * 1000,
      nowMs: now,
    });
    expect(await readEngaged("eng-1")).toBe(30 * 60 * 1000);
  });

  it("다른 방문자나 24시간이 지난 페이지뷰의 체류는 무시한다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(event("eng-2", now - 25 * HOUR_MS));
    await repository.recordAnalyticsEvent(event("eng-3", now));

    await repository.recordEngagement({
      pageviewId: "eng-2",
      visitorId: V1,
      engagedMs: 5000,
      nowMs: now,
    });
    await repository.recordEngagement({
      pageviewId: "eng-3",
      visitorId: "33333333-3333-4333-8333-333333333333",
      engagedMs: 5000,
      nowMs: now,
    });

    expect(await readEngaged("eng-2")).toBeNull();
    expect(await readEngaged("eng-3")).toBeNull();
  });

  it("보관 기간이 지난 행만 지운다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const now = Date.now();
    await repository.recordAnalyticsEvent(
      event("old-1", now - 800 * 24 * HOUR_MS),
    );
    await repository.recordAnalyticsEvent(event("new-1", now));

    await repository.purgeAnalyticsEventsBefore(now - 731 * 24 * HOUR_MS);

    const ids = await db
      .prepare("SELECT id FROM analytics_events WHERE id IN ('old-1', 'new-1')")
      .all<{ id: string }>();
    expect(ids.results.map((row) => row.id)).toEqual(["new-1"]);
  });
});
describe("방문자 인사이트 조회", () => {
  const kst = (value: string) => Date.parse(`${value}:00+09:00`);
  const kstMidnight = (date: string) => Date.parse(`${date}T00:00:00+09:00`);
  const ALL = {
    audience: "all",
    device: "all",
    referrer: "all",
    landing: "all",
  } as const;
  const RANGE = {
    from: "2026-08-01",
    to: "2026-08-07",
    days: 7,
    granularity: "day" as const,
    previous: { from: "2026-07-25", to: "2026-07-31" },
  };

  beforeAll(async () => {
    const repository = createVisitorEventRepository(createDB(db));
    await db.batch([
      db.prepare(
        "INSERT INTO generations (id, name, sort_order, start_date, end_date) VALUES ('vg1', '61기', 61, 0, 0)",
      ),
      db.prepare(
        "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id) VALUES ('va1', '여름 출사', '', 0, 0, '', 'vg1')",
      ),
      db.prepare(
        "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id, deleted_at) VALUES ('va2', '삭제된 활동', '', 0, 0, '', 'vg1', 1)",
      ),
      db
        .prepare(
          "INSERT INTO page_views (id, page_type, resource_id, view_count, visited_at) VALUES ('pv-1', 'home', 'home', 9, ?)",
        )
        .bind(kstMidnight("2026-08-02")),
    ]);
    const base = {
      sessionId: "is1",
      visitorId: "iv1",
      device: "desktop" as const,
      isMember: false,
    };
    await repository.recordAnalyticsEvent({
      ...base,
      id: "i1",
      visitedAt: kst("2026-07-20T10:00"),
      pageType: "home",
      resourceId: "home",
      referrerHost: "direct",
      sessionId: "is0",
    });
    await repository.recordAnalyticsEvent({
      ...base,
      id: "i2",
      visitedAt: kst("2026-08-02T10:00"),
      pageType: "home",
      resourceId: "home",
      referrerHost: "google.com",
    });
    await repository.recordAnalyticsEvent({
      ...base,
      id: "i3",
      visitedAt: kst("2026-08-02T10:01"),
      pageType: "activity",
      resourceId: "va1",
      referrerHost: null,
    });
    await repository.recordAnalyticsEvent({
      ...base,
      id: "i4",
      visitedAt: kst("2026-08-02T10:02"),
      pageType: "activity",
      resourceId: "va2",
      referrerHost: null,
    });
  });

  it("필터가 없으면 합계 페이지뷰와 이벤트 지표를 함께 돌려주고 제목을 붙인다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const result = await repository.getVisitorInsights(RANGE, ALL);

    expect(result.segmented).toBe(false);
    expect(result.summary).toMatchObject({
      views: 9,
      sessions: 1,
      visitors: 1,
      returningVisitors: 1,
    });
    expect(result.content).toEqual([
      expect.objectContaining({
        pageType: "home",
        resourceId: "home",
        title: null,
      }),
      expect.objectContaining({
        pageType: "activity",
        resourceId: "va1",
        title: "여름 출사",
      }),
    ]);
    expect(result.eventsTrackedSince).not.toBeNull();
  });

  it("필터가 있으면 페이지뷰도 이벤트에서 센다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    const result = await repository.getVisitorInsights(RANGE, {
      ...ALL,
      referrer: "google.com",
    });

    expect(result.segmented).toBe(true);
    expect(result.summary.views).toBe(3);
  });
});

describe("방문자 인사이트 읽기 상한", () => {
  it("상한을 넘는 이벤트는 최신 것만 읽고 잘렸다고 알린다", async () => {
    const kst = (value: string) => Date.parse(`${value}:00+09:00`);
    const writer = createVisitorEventRepository(createDB(db));
    const base = {
      visitorId: "cap-v",
      device: "desktop" as const,
      isMember: false,
      pageType: "home" as const,
      resourceId: "home",
      referrerHost: "direct",
    };
    await writer.recordAnalyticsEvent({ ...base, id: "cap-1", sessionId: "cap-s1", visitedAt: kst("2025-03-02T10:00") });
    await writer.recordAnalyticsEvent({ ...base, id: "cap-2", sessionId: "cap-s2", visitedAt: kst("2025-03-03T10:00") });
    await writer.recordAnalyticsEvent({ ...base, id: "cap-3", sessionId: "cap-s3", visitedAt: kst("2025-03-04T10:00") });

    const capped = createVisitorEventRepository(createDB(db), { maxInsightEvents: 2 });
    const result = await capped.getVisitorInsights(
      {
        from: "2025-03-01",
        to: "2025-03-07",
        days: 7,
        granularity: "day",
        previous: { from: "2025-02-22", to: "2025-02-28" },
      },
      { audience: "all", device: "all", referrer: "all", landing: "all" },
    );

    expect(result.truncated).toBe(true);
    expect(result.summary.sessions).toBe(2);
  });
});

describe("방문자 인사이트 기간 경계", () => {
  const kst = (value: string) => Date.parse(`${value}:00+09:00`);
  const ALL = {
    audience: "all",
    device: "all",
    referrer: "all",
    landing: "all",
  } as const;
  const base = {
    device: "desktop" as const,
    isMember: false,
    referrerHost: null,
  };

  it("비교 기간 시작 전에 시작한 세션은 어느 기간에도 세지 않는다", async () => {
    const repository = createVisitorEventRepository(createDB(db));
    await repository.recordAnalyticsEvent({
      ...base,
      id: "bd-1",
      visitorId: "bd-v1",
      sessionId: "bd-s1",
      visitedAt: kst("2025-09-30T23:58"),
      pageType: "home",
      resourceId: "home",
    });
    await repository.recordAnalyticsEvent({
      ...base,
      id: "bd-2",
      visitorId: "bd-v1",
      sessionId: "bd-s1",
      visitedAt: kst("2025-10-01T00:02"),
      pageType: "activity",
      resourceId: "bd-a",
    });
    await repository.recordAnalyticsEvent({
      ...base,
      id: "bd-3",
      visitorId: "bd-v2",
      sessionId: "bd-s2",
      visitedAt: kst("2025-10-02T10:00"),
      pageType: "home",
      resourceId: "home",
    });

    const result = await repository.getVisitorInsights(
      {
        from: "2025-10-08",
        to: "2025-10-14",
        days: 7,
        granularity: "day",
        previous: { from: "2025-10-01", to: "2025-10-07" },
      },
      ALL,
    );

    expect(result.summary.prev.sessions).toBe(1);
  });

  it("읽기 상한은 기간 전에 시작한 세션을 뺀 이벤트에 적용한다", async () => {
    const writer = createVisitorEventRepository(createDB(db));
    const event = (id: string, sessionId: string, at: string) =>
      writer.recordAnalyticsEvent({
        ...base,
        id,
        visitorId: "cb-v",
        sessionId,
        visitedAt: kst(at),
        pageType: "home",
        resourceId: "home",
      });
    // 가장 최근 두 이벤트는 기간 전에 시작한 세션의 뒷부분이다.
    await event("cb-0", "cb-early", "2025-12-24T23:58");
    await event("cb-1", "cb-early", "2025-12-25T00:02");
    await event("cb-2", "cb-early", "2025-12-25T00:05");
    await event("cb-3", "cb-inside", "2025-12-25T00:01");

    const capped = createVisitorEventRepository(createDB(db), {
      maxInsightEvents: 2,
    });
    const result = await capped.getVisitorInsights(
      {
        from: "2026-01-01",
        to: "2026-01-07",
        days: 7,
        granularity: "day",
        previous: { from: "2025-12-25", to: "2025-12-31" },
      },
      ALL,
    );

    expect(result.summary.prev.sessions).toBe(1);
    expect(result.truncated).toBe(false);
  });

  it("삭제된 페이지를 뺀 뒤 상위 콘텐츠를 고른다", async () => {
    await db.batch([
      db.prepare(
        "INSERT INTO generations (id, name, sort_order, start_date, end_date) VALUES ('tg1', '70기', 70, 0, 0)",
      ),
      db.prepare(
        "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id) VALUES ('ta-live', '남은 활동', '', 0, 0, '', 'tg1')",
      ),
    ]);
    const repository = createVisitorEventRepository(createDB(db));
    const visitedAt = kst("2025-11-03T10:00");
    const view = (id: string, resourceId: string, sessionId: string) =>
      repository.recordAnalyticsEvent({
        ...base,
        id,
        visitorId: "tc-v",
        sessionId,
        visitedAt,
        pageType: "activity",
        resourceId,
      });
    // 없는 활동 50개가 두 번씩 보여 살아 있는 활동(한 번)보다 위에 있다.
    await Promise.all(
      Array.from({ length: 50 }, (_, index) => [
        view(`tc-gone-${index}-a`, `tc-gone-${index}`, `tc-s-${index}-a`),
        view(`tc-gone-${index}-b`, `tc-gone-${index}`, `tc-s-${index}-b`),
      ]).flat(),
    );
    await view("tc-live", "ta-live", "tc-s-live");

    const result = await repository.getVisitorInsights(
      {
        from: "2025-11-03",
        to: "2025-11-09",
        days: 7,
        granularity: "day",
        previous: { from: "2025-10-27", to: "2025-11-02" },
      },
      ALL,
    );

    expect(result.content).toEqual([
      expect.objectContaining({ resourceId: "ta-live", title: "남은 활동" }),
    ]);
  });
});
