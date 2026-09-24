import { z } from "zod";

import { apiAuditActorSchema } from "./audit";
import {
  apiNullableStringSchema,
  apiRoleSchema,
  apiTimestampSchema,
} from "./common";

export const apiGenerationSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export type ApiGeneration = z.infer<typeof apiGenerationSchema>;

export const apiCreateGenerationInputSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
});

export type ApiCreateGenerationInput = z.infer<
  typeof apiCreateGenerationInputSchema
>;

export const apiUpdateGenerationInputSchema =
  apiCreateGenerationInputSchema.partial();

export type ApiUpdateGenerationInput = Partial<ApiCreateGenerationInput>;

/** 여러 기수의 정렬 순서를 한 번에 바꾸는 요청 (자리 맞바꾸기). */
export const apiReorderGenerationsInputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "중복된 기수를 전달할 수 없습니다.",
    )
    .refine(
      (items) =>
        new Set(items.map((item) => item.sortOrder)).size === items.length,
      "같은 정렬 순서를 두 기수에 줄 수 없습니다.",
    ),
});

export type ApiReorderGenerationsInput = z.infer<
  typeof apiReorderGenerationsInputSchema
>;

export const apiGenerationMemberSummarySchema = z.object({
  id: z.string(),
  generationId: z.string(),
  name: z.string(),
  image: apiNullableStringSchema,
  familyName: apiNullableStringSchema,
  givenName: apiNullableStringSchema,
  department: apiNullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: apiNullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export type ApiGenerationMemberSummary = z.infer<
  typeof apiGenerationMemberSummarySchema
>;

export const apiPublicGenerationMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: apiNullableStringSchema,
  showcaseImageUrls: z.array(z.url()),
  familyName: apiNullableStringSchema,
  givenName: apiNullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: apiNullableStringSchema,
  role: apiRoleSchema.nullable(),
  generationId: z.string(),
});

export type ApiPublicGenerationMember = z.infer<
  typeof apiPublicGenerationMemberSchema
>;

export const apiPublicGenerationWithMembersSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  startDate: apiTimestampSchema,
  endDate: apiTimestampSchema,
  members: z.array(apiPublicGenerationMemberSchema),
});

export type ApiPublicGenerationWithMembers = z.infer<
  typeof apiPublicGenerationWithMembersSchema
>;
