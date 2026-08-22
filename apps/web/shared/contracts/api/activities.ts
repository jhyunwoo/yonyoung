import { z } from "zod";

import { apiAuditActorSchema } from "@/shared/contracts/api/audit";
import { apiTimestampSchema } from "@/shared/contracts/api/common";

export const apiActivityImageSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  // 원본 픽셀 크기. 구버전 API 응답(필드 없음)도 허용하도록 default(null) 처리
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
});

export type ApiActivityImage = z.infer<typeof apiActivityImageSchema>;

export const apiActivitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  coverImageUrl: z.url(),
  generationId: z.string(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  detailImages: z.array(apiActivityImageSchema),
});

export type ApiActivity = z.infer<typeof apiActivitySchema>;

export const apiCreateActivityInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  coverImageUrl: z.url(),
  generationId: z.string(),
});

export type ApiCreateActivityInput = z.infer<
  typeof apiCreateActivityInputSchema
>;

export const apiUpdateActivityInputSchema =
  apiCreateActivityInputSchema.partial();

export type ApiUpdateActivityInput = Partial<ApiCreateActivityInput>;

export type ApiListActivitiesQuery = {
  generationId?: string;
};

export const apiCreateActivityImageInputSchema = z.object({
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type ApiCreateActivityImageInput = z.infer<
  typeof apiCreateActivityImageInputSchema
>;

export const apiUpdateActivityImageInputSchema =
  apiCreateActivityImageInputSchema.partial();

export type ApiUpdateActivityImageInput = Partial<ApiCreateActivityImageInput>;

export const apiUpdateActivityImageBatchItemInputSchema = z.object({
  imageId: z.string(),
  imageUrl: z.url().optional(),
  sortOrder: z.number().int().optional(),
});

export type ApiUpdateActivityImageBatchItemInput = z.infer<
  typeof apiUpdateActivityImageBatchItemInputSchema
>;
