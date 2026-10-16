import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type createDB from "../../lib/db";
import {
  activities,
  analyticsEvents,
  exhibitions,
  pageViews,
} from "../../platform/db/schema";
import type {
  InsightsSegment,
  NewAnalyticsEvent,
  PageViewAnalyticsRange,
  VisitorInsightsEntity,
} from "../../lib/services/types";
import type {
  PageViewDevice,
  PageViewType,
} from "../../lib/views/page-view-target";
import {
  KST_OFFSET_MS,
  addDays,
  fillDailySeries,
  kstDateStartMs,
} from "./page-view-analytics";
import { computeVisitorInsights, isSegmented } from "./visitor-insights";

type Database = ReturnType<typeof createDB>;

const DAY_MS = 24 * 60 * 60 * 1000;
// 체류 전송은 페이지를 떠날 때 오므로 하루가 지난 행을 고칠 이유가 없다. 공개 엔드포인트라 갱신 범위를 좁힌다.
const ENGAGEMENT_WINDOW_MS = DAY_MS;
/** 자리 비움 탭이 평균을 부풀리지 않도록 페이지뷰 1회 체류를 자른다. */
export const MAX_ENGAGED_MS = 30 * 60 * 1000;
export const ANALYTICS_EVENT_RETENTION_MS = 731 * DAY_MS;

/**
 * 조회 시 메모리로 읽는 이벤트 상한. 공개 엔드포인트로 행을 부풀려도 대시보드가 멈추지 않게 한다.
 * 넘으면 최신 이벤트만 집계하고 응답에 truncated를 싣는다.
 */
export const MAX_INSIGHT_EVENTS = 200_000;

export const createVisitorEventRepository = (
  db: Database,
  { maxInsightEvents = MAX_INSIGHT_EVENTS }: { maxInsightEvents?: number } = {},
) => ({
  async recordAnalyticsEvent(event: NewAnalyticsEvent): Promise<void> {
    await db
      .insert(analyticsEvents)
      .values({ ...event, visitedAt: new Date(event.visitedAt) })
      .onConflictDoNothing({ target: analyticsEvents.id });
  },

  /** 클라이언트는 누적 총량을 보낸다. 큰 값만 남기므로 재전송·순서 뒤바뀜에 안전하다. */
  async recordEngagement(input: {
    pageviewId: string;
    visitorId: string;
    engagedMs: number;
    nowMs: number;
  }): Promise<void> {
    const engagedMs = Math.min(input.engagedMs, MAX_ENGAGED_MS);
    await db
      .update(analyticsEvents)
      .set({
        engagedMs: sql`max(coalesce(${analyticsEvents.engagedMs}, 0), ${engagedMs})`,
      })
      .where(
        and(
          eq(analyticsEvents.id, input.pageviewId),
          eq(analyticsEvents.visitorId, input.visitorId),
          gte(
            analyticsEvents.visitedAt,
            new Date(input.nowMs - ENGAGEMENT_WINDOW_MS),
          ),
        ),
      );
  },

  async purgeAnalyticsEventsBefore(cutoffMs: number): Promise<void> {
    await db
      .delete(analyticsEvents)
      .where(lt(analyticsEvents.visitedAt, new Date(cutoffMs)));
  },

  async getVisitorInsights(
    range: PageViewAnalyticsRange,
    segment: InsightsSegment,
  ): Promise<VisitorInsightsEntity> {
    const previousStart = new Date(kstDateStartMs(range.previous.from));
    const currentStart = new Date(kstDateStartMs(range.from));
    const currentEnd = new Date(kstDateStartMs(addDays(range.to, 1)));
    const segmented = isSegmented(segment);
    const kstDay = sql<string>`date((${pageViews.visitedAt} + ${KST_OFFSET_MS}) / 1000, 'unixepoch')`;

    const visitorsInRange = db
      .selectDistinct({ visitorId: analyticsEvents.visitorId })
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.visitedAt, currentStart),
          lt(analyticsEvents.visitedAt, currentEnd),
        ),
      );

    const [eventRows, firstSeenRows, trackedRows, legacyRows] =
      await Promise.all([
        db
          .select()
          .from(analyticsEvents)
          .where(
            and(
              gte(analyticsEvents.visitedAt, previousStart),
              lt(analyticsEvents.visitedAt, currentEnd),
            ),
          )
          .orderBy(desc(analyticsEvents.visitedAt))
          .limit(maxInsightEvents + 1),
        db
          .select({
            visitorId: analyticsEvents.visitorId,
            first: sql<number>`min(${analyticsEvents.visitedAt})`,
          })
          .from(analyticsEvents)
          .where(inArray(analyticsEvents.visitorId, visitorsInRange))
          .groupBy(analyticsEvents.visitorId),
        db
          .select({
            first: sql<number | null>`min(${analyticsEvents.visitedAt})`,
          })
          .from(analyticsEvents),
        // 필터가 켜지면 합계 테이블은 나눌 수 없으므로 읽지 않는다.
        segmented
          ? Promise.resolve([] as Array<{ date: string; count: number }>)
          : db
              .select({
                date: kstDay,
                count: sql<number>`coalesce(sum(${pageViews.viewCount}), 0)`,
              })
              .from(pageViews)
              .where(
                and(
                  gte(pageViews.visitedAt, previousStart),
                  lt(pageViews.visitedAt, currentEnd),
                ),
              )
              .groupBy(kstDay),
      ]);

    const daily = legacyRows.map((row) => ({
      date: row.date,
      count: Number(row.count) || 0,
    }));
    const tracked = trackedRows[0]?.first;
    const computed = computeVisitorInsights({
      range,
      segment,
      events: eventRows.slice(0, maxInsightEvents).map((row) => ({
        ...row,
        visitedAt: row.visitedAt.getTime(),
        pageType: row.pageType as PageViewType,
        device: row.device as PageViewDevice,
      })),
      firstSeen: new Map(
        firstSeenRows.map((row) => [row.visitorId, Number(row.first)]),
      ),
      trackedSinceMs:
        tracked === null || tracked === undefined ? null : Number(tracked),
      legacy: segmented
        ? null
        : {
            current: fillDailySeries(daily, range.from, range.to),
            previous: fillDailySeries(
              daily,
              range.previous.from,
              range.previous.to,
            ),
          },
    });

    // 삭제됐거나 없는 활동·전시는 링크할 곳이 없으므로 표에서 뺀다.
    const titlesOf = async (
      table: typeof activities | typeof exhibitions,
      pageType: PageViewType,
    ) => {
      const ids = computed.content
        .filter((row) => row.pageType === pageType)
        .map((row) => row.resourceId);
      if (ids.length === 0) return new Map<string, string>();
      const rows = await db
        .select({ id: table.id, title: table.title })
        .from(table)
        .where(and(inArray(table.id, ids), isNull(table.deletedAt)));
      return new Map(rows.map((row) => [row.id, row.title]));
    };
    const [activityTitles, exhibitionTitles] = await Promise.all([
      titlesOf(activities, "activity"),
      titlesOf(exhibitions, "exhibition"),
    ]);

    return {
      ...computed,
      truncated: eventRows.length > maxInsightEvents,
      content: computed.content.flatMap(
        (row): VisitorInsightsEntity["content"] => {
          if (row.pageType === "activity" || row.pageType === "exhibition") {
            const title = (
              row.pageType === "activity" ? activityTitles : exhibitionTitles
            ).get(row.resourceId);
            return title === undefined ? [] : [{ ...row, title }];
          }
          return [{ ...row, title: null }];
        },
      ),
    };
  },
});
