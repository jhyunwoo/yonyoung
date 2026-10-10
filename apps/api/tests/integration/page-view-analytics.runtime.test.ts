import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { createPageViewRepository } from "../../src/features/page-views/page-view.repository";
import createDB from "../../src/lib/db";

const db = env.db as D1Database;

// KST 날짜 D의 자정은 UTC로 D-1 15:00이다.
const kstMidnight = (date: string) => Date.parse(`${date}T00:00:00Z`) - 9 * 60 * 60 * 1000;

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
  const view = (pageType: string, resourceId: string, date: string, count: number) =>
    db
      .prepare(
        "INSERT INTO page_views (id, page_type, resource_id, view_count, visited_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(`${pageType}:${resourceId}:${date}`, pageType, resourceId, count, kstMidnight(date));
  const entry = (dimension: string, value: string, date: string, count: number) =>
    db
      .prepare(
        "INSERT INTO page_view_entries (id, dimension, value, entry_count, visited_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(`${dimension}:${value}:${date}`, dimension, value, count, kstMidnight(date));

  await db.batch([
    db.prepare(
      "INSERT INTO generations (id, name, sort_order, start_date, end_date) VALUES ('g1', '60기', 60, 0, 0)",
    ),
    db.prepare(
      "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id) VALUES ('a1', '봄 출사', '', 0, 0, '', 'g1')",
    ),
    db.prepare(
      "INSERT INTO activities (id, title, description, start_date, end_date, cover_image_url, generation_id, deleted_at) VALUES ('a2', '삭제된 활동', '', 0, 0, '', 'g1', 1)",
    ),
    view("home", "home", "2026-09-25", 4),
    view("home", "home", "2026-10-01", 3),
    view("activity", "a1", "2026-10-02", 5),
    view("activity", "a2", "2026-10-02", 9),
    view("exhibition", "e-missing", "2026-10-07", 2),
    view("home", "home", "2026-10-08", 100),
    entry("referrer", "instagram.com", "2026-10-01", 2),
    entry("referrer", "direct", "2026-10-02", 1),
    entry("device", "mobile", "2026-10-01", 2),
    entry("device", "desktop", "2026-10-02", 1),
    entry("referrer", "direct", "2026-09-30", 4),
    entry("device", "desktop", "2026-09-30", 4),
  ]);
});

describe("D1 방문 분석 집계", () => {
  it("기간 경계, 이전 기간, 차원별 진입 수를 KST 기준으로 집계한다", async () => {
    const repository = createPageViewRepository(createDB(db));

    const result = await repository.getPageViewAnalytics({
      from: "2026-10-01",
      to: "2026-10-07",
      days: 7,
      granularity: "day",
      previous: { from: "2026-09-24", to: "2026-09-30" },
    });

    expect(result.summary).toEqual({
      totalViews: 19,
      prevTotalViews: 4,
      dailyAverage: 2.7,
      peak: { date: "2026-10-02", count: 14 },
      entries: 3,
      prevEntries: 4,
    });
    expect(result.trend).toHaveLength(7);
    expect(result.trend.slice(0, 2)).toEqual([
      { bucket: "2026-10-01", views: 3, prevViews: 0 },
      { bucket: "2026-10-02", views: 14, prevViews: 4 },
    ]);
    expect(result.byPageType).toEqual([
      { pageType: "activity", views: 14 },
      { pageType: "home", views: 3 },
      { pageType: "exhibition", views: 2 },
    ]);
    // 삭제된 활동과 존재하지 않는 전시는 인기 콘텐츠에서 빠진다.
    expect(result.topActivities).toEqual([{ resourceId: "a1", title: "봄 출사", views: 5 }]);
    expect(result.topExhibitions).toEqual([]);
    expect(result.referrers).toEqual([
      { host: "instagram.com", entries: 2 },
      { host: "direct", entries: 1 },
    ]);
    expect(result.devices).toEqual([
      { device: "mobile", entries: 2 },
      { device: "desktop", entries: 1 },
    ]);
    expect(result.entriesTrackedSince).toBe("2026-09-30");
  });
});
