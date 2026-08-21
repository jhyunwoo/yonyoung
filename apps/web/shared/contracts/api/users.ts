import { z } from "zod";

import type { ApiAuditAction } from "@/shared/contracts/api/audit";
import { apiAuditActorSchema } from "@/shared/contracts/api/audit";
import {
  apiNullableStringSchema,
  apiRoleSchema,
  apiTimestampSchema,
} from "@/shared/contracts/api/common";
import {
  CORE_ROLE_VALUES,
  type CoreRole,
} from "@/shared/contracts/auth-roles";

export const apiUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: apiNullableStringSchema,
  showcaseImageUrls: z.array(z.url()),
  familyName: apiNullableStringSchema,
  givenName: apiNullableStringSchema,
  college: apiNullableStringSchema,
  department: apiNullableStringSchema,
  studentNumber: apiNullableStringSchema,
  phoneNumber: apiNullableStringSchema,
  collaborationAvailable: z.boolean(),
  personalLink: apiNullableStringSchema,
  role: apiRoleSchema.nullable(),
  generationId: z.string().nullable(),
  generationIds: z.array(z.string()).optional(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export type ApiUser = z.infer<typeof apiUserSchema>;

export type ApiUserResourceHistoryResourceType =
  | "activity"
  | "exhibition"
  | "linktree"
  | "linktree_item";

export type ApiUserResourceHistoryItem = {
  id: string;
  resourceType: ApiUserResourceHistoryResourceType;
  resourceId: string;
  resourceTitle: string | null;
  action: ApiAuditAction;
  changedFields: string[];
  isDeleted: boolean;
  generationId: string | null;
  linktreeId: string | null;
  createdAt: number;
};

export type ApiUserResourceHistory = {
  items: ApiUserResourceHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const apiAdminUpdateUserInputSchema = z.object({
  name: z.string().optional(),
  image: apiNullableStringSchema.optional(),
  showcaseImageUrls: z.array(z.url()).optional(),
  familyName: apiNullableStringSchema.optional(),
  givenName: apiNullableStringSchema.optional(),
  college: apiNullableStringSchema.optional(),
  department: apiNullableStringSchema.optional(),
  studentNumber: apiNullableStringSchema.optional(),
  phoneNumber: apiNullableStringSchema.optional(),
  collaborationAvailable: z.boolean().optional(),
  personalLink: apiNullableStringSchema.optional(),
  role: z.enum(CORE_ROLE_VALUES).optional(),
  generationIds: z.array(z.string()).optional(),
  generationId: z.string().nullable().optional(),
});

export type ApiAdminUpdateUserInput = {
  name?: string;
  image?: string | null;
  showcaseImageUrls?: string[];
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  collaborationAvailable?: boolean;
  personalLink?: string | null;
  role?: CoreRole;
  generationIds?: string[];
  generationId?: string | null;
};

export const apiMemberProfileUpdateInputSchema = z.object({
  image: apiNullableStringSchema.optional(),
  showcaseImageUrls: z.array(z.url()).optional(),
  familyName: apiNullableStringSchema.optional(),
  givenName: apiNullableStringSchema.optional(),
  college: apiNullableStringSchema.optional(),
  department: apiNullableStringSchema.optional(),
  studentNumber: apiNullableStringSchema.optional(),
  phoneNumber: apiNullableStringSchema.optional(),
  collaborationAvailable: z.boolean().optional(),
  personalLink: apiNullableStringSchema.optional(),
});

export type ApiMemberProfileUpdateInput = {
  image?: string | null;
  showcaseImageUrls?: string[];
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  collaborationAvailable?: boolean;
  personalLink?: string | null;
};

export const apiUpdateUserInputSchema = z.union([
  apiAdminUpdateUserInputSchema,
  apiMemberProfileUpdateInputSchema,
]);

export type ApiUpdateUserInput =
  | ApiAdminUpdateUserInput
  | ApiMemberProfileUpdateInput;

export const apiBulkUpdateUserRoleInputSchema = z.object({
  userIds: z.array(z.string()).min(1),
  role: z.enum(CORE_ROLE_VALUES),
});

export type ApiBulkUpdateUserRoleInput = z.infer<
  typeof apiBulkUpdateUserRoleInputSchema
>;
