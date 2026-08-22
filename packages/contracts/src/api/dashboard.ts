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
