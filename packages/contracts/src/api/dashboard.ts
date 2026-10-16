import { z } from "zod";

export const apiAdminDashboardStatsSchema = z.object({
  usersTotal: z.number().int(),
  unverifiedUsersTotal: z.number().int(),
  generationsTotal: z.number().int(),
  selectedGenerationMembersTotal: z.number().int(),
  selectedGenerationActivitiesTotal: z.number().int(),
  selectedGenerationExhibitionsTotal: z.number().int(),
  linktreeLinksTotal: z.number().int(),
  r2StorageUsedBytes: z.number().int(),
  r2StorageLimitBytes: z.number().int(),
  r2StorageUsageAvailable: z.boolean(),
});

export type ApiAdminDashboardStats = z.infer<
  typeof apiAdminDashboardStatsSchema
>;

const pageViewPeriodSchema = z.object({
  count: z.number().int(),
  prevCount: z.number().int(),
});

export const apiPageViewStatsSchema = z.object({
  today: pageViewPeriodSchema,
  thisWeek: pageViewPeriodSchema,
  dailyTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int(),
    }),
  ),
});

export type ApiPageViewStats = z.infer<typeof apiPageViewStatsSchema>;

const pageViewGranularitySchema = z.enum(["day", "week", "month"]);
const topContentSchema = z.object({
  resourceId: z.string(),
  title: z.string(),
  views: z.number().int(),
});

export const apiPageViewAnalyticsSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    days: z.number().int(),
    granularity: pageViewGranularitySchema,
  }),
  previousRange: z.object({ from: z.string(), to: z.string() }),
  summary: z.object({
    totalViews: z.number().int(),
    prevTotalViews: z.number().int(),
    dailyAverage: z.number(),
    peak: z.object({ date: z.string(), count: z.number().int() }).nullable(),
    entries: z.number().int(),
    prevEntries: z.number().int(),
  }),
  trend: z.array(
    z.object({
      bucket: z.string(),
      views: z.number().int(),
      prevViews: z.number().int(),
    }),
  ),
  byPageType: z.array(
    z.object({
      pageType: z.enum(["home", "activity", "exhibition", "notice"]),
      views: z.number().int(),
    }),
  ),
  topActivities: z.array(topContentSchema),
  topExhibitions: z.array(topContentSchema),
  weekdays: z.array(
    z.object({ weekday: z.number().int(), averageViews: z.number() }),
  ),
  referrers: z.array(z.object({ host: z.string(), entries: z.number().int() })),
  devices: z.array(
    z.object({
      device: z.enum(["mobile", "tablet", "desktop"]),
      entries: z.number().int(),
    }),
  ),
  entriesTrackedSince: z.string().nullable(),
});

export type ApiPageViewGranularity = z.infer<typeof pageViewGranularitySchema>;
export type ApiPageViewAnalytics = z.infer<typeof apiPageViewAnalyticsSchema>;

const insightsPageTypeSchema = z.enum([
  "home",
  "activity",
  "exhibition",
  "notice",
]);
const insightsRateSchema = z.number().min(0).max(1);
const insightsCoreSchema = z.object({
  views: z.number().int(),
  visitors: z.number().int(),
  sessions: z.number().int(),
  pagesPerSession: z.number(),
  avgSessionMs: z.number().int(),
  bounceRate: insightsRateSchema,
});

export const apiVisitorInsightsSchema = z.object({
  range: z.object({
    from: z.string(),
    to: z.string(),
    days: z.number().int(),
    granularity: pageViewGranularitySchema,
  }),
  previousRange: z.object({ from: z.string(), to: z.string() }),
  eventsTrackedSince: z.string().nullable(),
  segmented: z.boolean(),
  summary: insightsCoreSchema.extend({
    unmeasuredSessions: z.number().int(),
    newVisitors: z.number().int(),
    returningVisitors: z.number().int(),
    prev: insightsCoreSchema,
  }),
  trend: z.array(
    z.object({
      bucket: z.string(),
      views: z.number().int(),
      visitors: z.number().int(),
      sessions: z.number().int(),
      avgSessionMs: z.number().int(),
      newVisitors: z.number().int(),
      returningVisitors: z.number().int(),
      prevViews: z.number().int(),
      prevVisitors: z.number().int(),
      prevSessions: z.number().int(),
      prevAvgSessionMs: z.number().int(),
      collected: z.boolean(),
    }),
  ),
  hourly: z.array(
    z.object({
      weekday: z.number().int(),
      hour: z.number().int(),
      views: z.number().int(),
    }),
  ),
  referrerFlow: z.array(
    z.object({
      referrer: z.string(),
      landing: insightsPageTypeSchema,
      sessions: z.number().int(),
    }),
  ),
  pathFlow: z.array(
    z.object({
      step: z.union([z.literal(1), z.literal(2)]),
      from: insightsPageTypeSchema,
      to: z.union([insightsPageTypeSchema, z.literal("exit")]),
      sessions: z.number().int(),
    }),
  ),
  content: z.array(
    z.object({
      pageType: insightsPageTypeSchema,
      resourceId: z.string(),
      title: z.string().nullable(),
      views: z.number().int(),
      visitors: z.number().int(),
      avgEngagedMs: z.number().int().nullable(),
      entries: z.number().int(),
      bounceRate: insightsRateSchema.nullable(),
    }),
  ),
  devices: z.array(
    z.object({
      device: z.enum(["mobile", "tablet", "desktop"]),
      sessions: z.number().int(),
    }),
  ),
  audience: z.object({ member: z.number().int(), external: z.number().int() }),
  depth: z.array(
    z.object({
      bucket: z.enum(["1", "2", "3", "4", "5+"]),
      sessions: z.number().int(),
    }),
  ),
  duration: z.array(
    z.object({
      bucket: z.enum(["<10s", "10-30s", "30s-1m", "1-3m", "3-10m", "10m+"]),
      sessions: z.number().int(),
    }),
  ),
  cohorts: z.array(
    z.object({
      week: z.string(),
      size: z.number().int(),
      retention: z.array(insightsRateSchema.nullable()),
    }),
  ),
  referrerOptions: z.array(z.string()),
});

export type ApiVisitorInsights = z.infer<typeof apiVisitorInsightsSchema>;
export type ApiInsightsPageType = z.infer<typeof insightsPageTypeSchema>;
