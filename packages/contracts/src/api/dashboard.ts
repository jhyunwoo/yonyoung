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
