import { z } from "zod";

import { apiAuditActorSchema } from "@/shared/contracts/api/audit";
import {
  apiNullableStringSchema,
  apiRoleSchema,
  apiTimestampSchema,
} from "@/shared/contracts/api/common";

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
