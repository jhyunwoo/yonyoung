import { and, eq, gte, lt, sql } from "drizzle-orm";
import type createDB from "../../lib/db";
import { analyticsEvents } from "../../platform/db/schema";
import type { NewAnalyticsEvent } from "../../lib/services/types";

type Database = ReturnType<typeof createDB>;

const DAY_MS = 24 * 60 * 60 * 1000;
// 체류 전송은 페이지를 떠날 때 오므로 하루가 지난 행을 고칠 이유가 없다. 공개 엔드포인트라 갱신 범위를 좁힌다.
const ENGAGEMENT_WINDOW_MS = DAY_MS;
/** 자리 비움 탭이 평균을 부풀리지 않도록 페이지뷰 1회 체류를 자른다. */
export const MAX_ENGAGED_MS = 30 * 60 * 1000;
export const ANALYTICS_EVENT_RETENTION_MS = 731 * DAY_MS;

export const createVisitorEventRepository = (db: Database) => ({
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
});
