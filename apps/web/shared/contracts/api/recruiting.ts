import { z } from "zod";

import { apiTimestampSchema } from "@/shared/contracts/api/common";

export const apiRecruitingPlanSchema = z.object({
  year: z.number().int(),
  title: z.string(),
  content: z.string(),
  promotionImageUrls: z.array(z.url()),
  recruitmentStartAt: apiTimestampSchema,
  recruitmentEndAt: apiTimestampSchema,
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
});

export type ApiRecruitingPlan = z.infer<typeof apiRecruitingPlanSchema>;

export const apiUpsertCurrentRecruitingPlanInputSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  promotionImageUrls: z.array(z.url()),
  recruitmentStartAt: apiTimestampSchema,
  recruitmentEndAt: apiTimestampSchema,
});

export type ApiUpsertCurrentRecruitingPlanInput = z.infer<
  typeof apiUpsertCurrentRecruitingPlanInputSchema
>;
