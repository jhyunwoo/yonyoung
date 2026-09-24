import { asc, eq, gte } from "drizzle-orm";
import type createDB from "../../lib/db";
import { recruitingPlans } from "../../platform/db/schema";
import type { RecruitingPlanEntity } from "../../lib/services/types";
import { parseJsonStringArray } from "../../platform/db/row-values";

type Database = ReturnType<typeof createDB>;

// "현재 모집 계획"은 UTC가 아니라 한국 기준 연도로 결정된다.
const KOREA_TIME_ZONE = "Asia/Seoul";
const koreanYearFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  timeZone: KOREA_TIME_ZONE,
});

const readKoreanYear = (at: Date | number): number => {
  const formatted = koreanYearFormatter.format(at);
  const parsed = Number.parseInt(formatted, 10);
  return Number.isFinite(parsed) ? parsed : new Date(at).getUTCFullYear();
};

const serializePromotionImageUrls = (value: string[] | undefined): string =>
  JSON.stringify(value ?? []);

const toRecruitingPlanEntity = (
  row: typeof recruitingPlans.$inferSelect,
): RecruitingPlanEntity => ({
  year: row.year,
  title: row.title,
  content: row.content,
  promotionImageUrls: parseJsonStringArray(row.promotionImageUrls),
  recruitmentStartAt: row.recruitmentStartAt,
  recruitmentEndAt: row.recruitmentEndAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export type UpsertRecruitingPlanInput = {
  title: string;
  content: string;
  promotionImageUrls: string[];
  recruitmentStartAt: Date;
  recruitmentEndAt: Date;
};

export const createRecruitingPlanRepository = (db: Database) => ({
  /**
   * 공개·관리자 화면이 보여 줄 "현재" 모집 계획.
   *
   * 1) 아직 끝나지 않은(진행 중 또는 예정) 계획 중 가장 먼저 시작하는 것
   * 2) 없으면 올해(한국 기준) 계획 — 모집이 끝난 뒤에도 연말까지 안내를 유지한다
   *
   * 예전에는 벽시계 연도만 보고 골라서, 해를 넘기는 모집(12월 공지 → 1월 모집)이
   * 1월 1일 0시에 사라지고 12월에 저장한 다음 해 계획이 올해 계획을 덮어썼다.
   */
  async getCurrentRecruitingPlan(): Promise<RecruitingPlanEntity | null> {
    const now = new Date();
    const [activeOrUpcoming] = await db
      .select()
      .from(recruitingPlans)
      .where(gte(recruitingPlans.recruitmentEndAt, now))
      .orderBy(asc(recruitingPlans.recruitmentStartAt))
      .limit(1);
    if (activeOrUpcoming) {
      return toRecruitingPlanEntity(activeOrUpcoming);
    }

    const row =
      (await db.query.recruitingPlans.findFirst({
        where: eq(recruitingPlans.year, readKoreanYear(now)),
      })) ?? null;

    return row ? toRecruitingPlanEntity(row) : null;
  },

  async upsertCurrentRecruitingPlan(
    input: UpsertRecruitingPlanInput,
  ): Promise<RecruitingPlanEntity> {
    // 계획은 모집 시작일이 속한 연도(한국 기준)로 저장한다. 12월에 다음 해 봄 모집을
    // 등록해도 올해 계획을 덮어쓰지 않는다.
    const planYear = readKoreanYear(input.recruitmentStartAt);

    await db
      .insert(recruitingPlans)
      .values({
        year: planYear,
        title: input.title,
        content: input.content,
        promotionImageUrls: serializePromotionImageUrls(
          input.promotionImageUrls,
        ),
        recruitmentStartAt: input.recruitmentStartAt,
        recruitmentEndAt: input.recruitmentEndAt,
      })
      .onConflictDoUpdate({
        target: recruitingPlans.year,
        set: {
          title: input.title,
          content: input.content,
          promotionImageUrls: serializePromotionImageUrls(
            input.promotionImageUrls,
          ),
          recruitmentStartAt: input.recruitmentStartAt,
          recruitmentEndAt: input.recruitmentEndAt,
          updatedAt: new Date(),
        },
      });

    const saved = await db.query.recruitingPlans.findFirst({
      where: eq(recruitingPlans.year, planYear),
    });
    if (!saved) {
      throw new Error("모집 계획 저장 결과를 찾을 수 없습니다.");
    }

    return toRecruitingPlanEntity(saved);
  },
});

export type RecruitingPlanRepository = ReturnType<
  typeof createRecruitingPlanRepository
>;
