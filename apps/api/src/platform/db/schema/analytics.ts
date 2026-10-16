import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { nowTimestamp } from "./columns";

export const viewCounts = sqliteTable(
  "view_counts",
  {
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceType, table.resourceId] }),
    index("view_counts_resource_type_idx").on(table.resourceType),
  ],
);

export const pageViews = sqliteTable(
  "page_views",
  {
    id: text("id").primaryKey(),
    pageType: text("page_type").notNull(), // 'home' | 'activity' | 'exhibition'
    resourceId: text("resource_id"), // null for home
    viewCount: integer("view_count").default(1).notNull(),
    visitedAt: integer("visited_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
  },
  (table) => [
    index("page_views_page_type_idx").on(table.pageType),
    index("page_views_resource_id_idx").on(table.resourceId),
    index("page_views_visited_at_idx").on(table.visitedAt),
  ],
);

/**
 * 문서 로드당 첫 페이지뷰(진입)만 유입 경로와 기기 종류로 나눠 KST 일 단위로 누적한다.
 * IP나 UA 원문은 저장하지 않는다.
 */
export const pageViewEntries = sqliteTable(
  "page_view_entries",
  {
    id: text("id").primaryKey(),
    dimension: text("dimension").notNull(), // 'referrer' | 'device'
    value: text("value").notNull(),
    entryCount: integer("entry_count").default(1).notNull(),
    visitedAt: integer("visited_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
  },
  (table) => [
    index("page_view_entries_dimension_visited_at_idx").on(
      table.dimension,
      table.visitedAt,
    ),
  ],
);

/**
 * 페이지뷰 1회 = 1행. 방문자·세션 ID는 브라우저가 만든 무작위 UUID라 개인을 가리키지 않는다.
 * referrer_host는 세션 첫 페이지뷰에만 채운다.
 */
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    sessionId: text("session_id").notNull(),
    visitedAt: integer("visited_at", { mode: "timestamp_ms" }).notNull(),
    pageType: text("page_type").notNull(),
    resourceId: text("resource_id").notNull(),
    referrerHost: text("referrer_host"),
    device: text("device").notNull(),
    isMember: integer("is_member", { mode: "boolean" }).notNull(),
    engagedMs: integer("engaged_ms"),
  },
  (table) => [
    index("analytics_events_visited_at_idx").on(table.visitedAt),
    index("analytics_events_visitor_visited_at_idx").on(
      table.visitorId,
      table.visitedAt,
    ),
    index("analytics_events_session_idx").on(table.sessionId),
  ],
);

/**
 * 페이지뷰 행보다 먼저 도착한 체류 시간. 빠르게 떠나면 체류 전송이 페이지뷰 기록을 앞지르므로,
 * 여기 두었다가 페이지뷰를 기록할 때 반영하고 지운다. 하루 지나도 짝이 없으면 정리한다.
 */
export const analyticsPendingEngagement = sqliteTable(
  "analytics_pending_engagement",
  {
    pageviewId: text("pageview_id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    engagedMs: integer("engaged_ms").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("analytics_pending_engagement_received_at_idx").on(table.receivedAt),
  ],
);
