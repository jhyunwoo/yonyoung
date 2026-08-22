import { z } from "zod";

import {
  apiNullableStringSchema,
  apiRoleSchema,
  apiTimestampSchema,
} from "@/shared/contracts/api/common";

export const apiAuditResourceTypeSchema = z.enum([
  "generation",
  "activity",
  "exhibition",
  "linktree",
  "linktree_item",
  "user",
  "attachment",
]);

export type ApiAuditResourceType = z.infer<typeof apiAuditResourceTypeSchema>;

export const apiAuditActionSchema = z.enum(["create", "update", "delete"]);

export type ApiAuditAction = z.infer<typeof apiAuditActionSchema>;

export const apiAuditActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  familyName: apiNullableStringSchema,
  givenName: apiNullableStringSchema,
  role: apiRoleSchema.nullable(),
});

export type ApiAuditActor = z.infer<typeof apiAuditActorSchema>;

export const apiAuditLogSchema = z.object({
  id: z.string(),
  resourceType: apiAuditResourceTypeSchema,
  resourceId: z.string(),
  action: apiAuditActionSchema,
  actor: apiAuditActorSchema.nullable(),
  changedFields: z.array(z.string()),
  createdAt: apiTimestampSchema,
});

export type ApiAuditLog = z.infer<typeof apiAuditLogSchema>;
