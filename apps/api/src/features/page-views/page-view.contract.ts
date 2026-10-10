import { z } from "../../shared/openapi/zod";
import {
  EXAMPLE_ID,
  EXAMPLE_PARENT_ID,
} from "../../shared/openapi/field-builders";

export const ApiRecordViewBodySchema = z
  .object({
    resourceType: z.enum(["activity", "exhibition", "home", "notice"]).openapi({
      description: "조회수를 기록할 리소스 타입",
      example: "activity",
    }),
    resourceId: z.string().max(128).optional().openapi({
      description: "조회수를 기록할 리소스 UUID (home인 경우 생략 가능)",
      example: EXAMPLE_ID,
    }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.resourceType === "activity" ||
        value.resourceType === "exhibition") &&
      !z.string().uuid().safeParse(value.resourceId).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resourceId"],
        message:
          "activity/exhibition 조회에는 유효한 리소스 UUID가 필요합니다.",
      });
    }
  })
  .openapi("ApiRecordViewBody");

export const ApiViewCountsQuerySchema = z
  .object({
    resourceType: z.enum(["activity", "exhibition", "home", "notice"]).openapi({
      description: "조회수를 조회할 리소스 타입",
      example: "activity",
    }),
    resourceIds: z
      .string()
      .min(1, "resourceIds는 필수입니다.")
      .openapi({
        description: "쉼표(,)로 구분된 리소스 UUID 목록",
        example: `${EXAMPLE_ID},${EXAMPLE_PARENT_ID}`,
      }),
  })
  .openapi("ApiViewCountsQuery");

export const ApiViewCountsResponseSchema = z
  .record(z.string(), z.number().int().nonnegative())
  .openapi("ApiViewCountsResponse");
export const ApiRecordPageViewRequestSchema = z
  .object({
    pageType: z.enum(["home", "activity", "exhibition", "notice"]).openapi({
      description: "페이지 타입",
      example: "activity",
    }),
    resourceId: z.string().max(128).optional().openapi({
      description: "리소스 ID (activity/exhibition/notice의 경우)",
      example: EXAMPLE_ID,
    }),
    entry: z.boolean().optional().openapi({
      description:
        "문서 로드 후 첫 페이지뷰(외부 유입 또는 직접 접속)이면 true. true일 때만 유입 경로와 기기 종류를 기록한다.",
      example: true,
    }),
    referrerHost: z.string().max(253).optional().openapi({
      description: "외부 유입 경로의 호스트명. 직접 접속이면 생략한다.",
      example: "instagram.com",
    }),
  })
  .superRefine((value, ctx) => {
    if (
      (value.pageType === "activity" || value.pageType === "exhibition") &&
      !z.string().uuid().safeParse(value.resourceId).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["resourceId"],
        message:
          "activity/exhibition 방문에는 유효한 리소스 UUID가 필요합니다.",
      });
    }
  })
  .openapi("ApiRecordPageViewRequest");

export const ApiPageViewStatsSchema = z
  .object({
    totalViews: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "전체 방문 수" }),
    homeViews: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "홈 방문 수" }),
    activityViews: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "활동 방문 수" }),
    exhibitionViews: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "전시 방문 수" }),
    noticeViews: z
      .number()
      .int()
      .nonnegative()
      .openapi({ description: "공지 방문 수" }),
    topActivities: z
      .array(
        z.object({
          resourceId: z.string(),
          count: z.number().int().nonnegative(),
        }),
      )
      .openapi({ description: "조회수 상위 활동 (최대 10개)" }),
    topExhibitions: z
      .array(
        z.object({
          resourceId: z.string(),
          count: z.number().int().nonnegative(),
        }),
      )
      .openapi({ description: "조회수 상위 전시 (최대 10개)" }),
    dailyTrend: z
      .array(
        z.object({
          date: z.string(),
          count: z.number().int().nonnegative(),
        }),
      )
      .openapi({ description: "최근 30일 일별 방문 추세" }),
  })
  .openapi("ApiPageViewStats");

export const ApiDashboardPageViewStatsSchema = z
  .object({
    today: z.object({
      count: z
        .number()
        .int()
        .nonnegative()
        .openapi({ description: "오늘 방문 수" }),
      prevCount: z
        .number()
        .int()
        .nonnegative()
        .openapi({ description: "어제 방문 수" }),
    }),
    thisWeek: z.object({
      count: z
        .number()
        .int()
        .nonnegative()
        .openapi({ description: "이번 주 방문 수" }),
      prevCount: z
        .number()
        .int()
        .nonnegative()
        .openapi({ description: "지난 주 방문 수" }),
    }),
    dailyTrend: z
      .array(
        z.object({
          date: z.string(),
          count: z.number().int().nonnegative(),
        }),
      )
      .openapi({ description: "최근 30일 일별 방문 추세" }),
  })
  .openapi("ApiDashboardPageViewStats");

const nonNegativeInt = z.number().int().nonnegative();
const analyticsDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const topContentItem = z.object({
  resourceId: z.string(),
  title: z.string(),
  views: nonNegativeInt,
});

export const ApiPageViewAnalyticsQuerySchema = z
  .object({
    from: analyticsDate.optional().openapi({
      description: "시작일(KST, 포함). 생략하면 종료일 기준 최근 30일",
      example: "2026-09-11",
    }),
    to: analyticsDate.optional().openapi({
      description: "종료일(KST, 포함). 생략하거나 오늘 이후면 오늘",
      example: "2026-10-10",
    }),
    granularity: z.enum(["day", "week", "month"]).optional().openapi({
      description:
        "집계 단위. 생략하면 31일 이하 day, 183일 이하 week, 그보다 길면 month",
      example: "day",
    }),
  })
  .openapi("ApiPageViewAnalyticsQuery");

export const ApiPageViewAnalyticsSchema = z
  .object({
    range: z.object({
      from: z.string(),
      to: z.string(),
      days: nonNegativeInt,
      granularity: z.enum(["day", "week", "month"]),
    }),
    previousRange: z
      .object({ from: z.string(), to: z.string() })
      .openapi({ description: "직전 같은 길이 기간" }),
    summary: z.object({
      totalViews: nonNegativeInt,
      prevTotalViews: nonNegativeInt,
      dailyAverage: z.number().nonnegative(),
      peak: z.object({ date: z.string(), count: nonNegativeInt }).nullable(),
      entries: nonNegativeInt.openapi({ description: "진입 수" }),
      prevEntries: nonNegativeInt,
    }),
    trend: z
      .array(
        z.object({
          bucket: z.string(),
          views: nonNegativeInt,
          prevViews: nonNegativeInt,
        }),
      )
      .openapi({
        description:
          "빈 날짜를 0으로 채운 추이. bucket은 day/week면 구간 첫날(YYYY-MM-DD), month면 YYYY-MM",
      }),
    byPageType: z.array(
      z.object({
        pageType: z.enum(["home", "activity", "exhibition", "notice"]),
        views: nonNegativeInt,
      }),
    ),
    topActivities: z
      .array(topContentItem)
      .openapi({ description: "기간 내 상위 활동 (최대 10개)" }),
    topExhibitions: z
      .array(topContentItem)
      .openapi({ description: "기간 내 상위 전시 (최대 10개)" }),
    weekdays: z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          averageViews: z.number().nonnegative(),
        }),
      )
      .openapi({ description: "요일별 일평균 조회수. weekday는 월요일이 0" }),
    referrers: z
      .array(z.object({ host: z.string(), entries: nonNegativeInt }))
      .openapi({
        description:
          "유입 경로별 진입 수. direct는 직접 접속, other는 상위 10개 밖",
      }),
    devices: z.array(
      z.object({
        device: z.enum(["mobile", "tablet", "desktop"]),
        entries: nonNegativeInt,
      }),
    ),
    entriesTrackedSince: z.string().nullable().openapi({
      description: "진입 데이터 수집 시작일(KST). 데이터가 없으면 null",
    }),
  })
  .openapi("ApiPageViewAnalytics");
