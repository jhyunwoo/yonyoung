import { z } from "zod";

import { apiAuditActorSchema } from "@/shared/contracts/api/audit";
import { apiTimestampSchema } from "@/shared/contracts/api/common";

export const apiExhibitionImageSchema = z.object({
  id: z.string(),
  exhibitionId: z.string(),
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  // 원본 픽셀 크기. 구버전 API 응답(필드 없음)도 허용하도록 default(null) 처리
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
});

export type ApiExhibitionImage = z.infer<typeof apiExhibitionImageSchema>;

export const apiExhibitionSchema = z.object({
  id: z.string(),
  title: z.string(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  generationId: z.string(),
  place: z.string(),
  coverImageUrl: z.url(),
  description: z.string(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  detailImages: z.array(apiExhibitionImageSchema),
});

export type ApiExhibition = z.infer<typeof apiExhibitionSchema>;

export const apiCreateExhibitionInputSchema = z.object({
  title: z.string().trim().min(1),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  generationId: z.string(),
  place: z.string().trim().min(1),
  coverImageUrl: z.url(),
  description: z.string(),
});

export type ApiCreateExhibitionInput = z.infer<
  typeof apiCreateExhibitionInputSchema
>;

export const apiUpdateExhibitionInputSchema =
  apiCreateExhibitionInputSchema.partial();

export type ApiUpdateExhibitionInput = Partial<ApiCreateExhibitionInput>;

export type ApiListExhibitionsQuery = {
  generationId?: string;
};

export const apiCreateExhibitionImageInputSchema = z.object({
  imageUrl: z.url(),
  sortOrder: z.number().int(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type ApiCreateExhibitionImageInput = z.infer<
  typeof apiCreateExhibitionImageInputSchema
>;

export const apiUpdateExhibitionImageInputSchema =
  apiCreateExhibitionImageInputSchema.partial();

export type ApiUpdateExhibitionImageInput = Partial<ApiCreateExhibitionImageInput>;

export const apiUpdateExhibitionImageBatchItemInputSchema = z.object({
  imageId: z.string(),
  imageUrl: z.url().optional(),
  sortOrder: z.number().int().optional(),
});

export type ApiUpdateExhibitionImageBatchItemInput = z.infer<
  typeof apiUpdateExhibitionImageBatchItemInputSchema
>;
