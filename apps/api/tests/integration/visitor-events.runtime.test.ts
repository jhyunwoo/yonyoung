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
