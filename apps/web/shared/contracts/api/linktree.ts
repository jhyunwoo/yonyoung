import { z } from "zod";

import { apiAuditActorSchema } from "@/shared/contracts/api/audit";
import { apiTimestampSchema } from "@/shared/contracts/api/common";

export const apiLinktreeItemSchema = z.object({
  id: z.string(),
  linktreeId: z.string(),
  name: z.string(),
  link: z.url(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
});

export type ApiLinktreeItem = z.infer<typeof apiLinktreeItemSchema>;

export const apiLinktreeSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
  updatedBy: apiAuditActorSchema.nullable(),
  items: z.array(apiLinktreeItemSchema),
});

export type ApiLinktree = z.infer<typeof apiLinktreeSchema>;

export const apiCreateLinktreeInputSchema = z.object({
  name: z.string().trim().min(1),
});

export type ApiCreateLinktreeInput = z.infer<
  typeof apiCreateLinktreeInputSchema
>;

export const apiUpdateLinktreeInputSchema =
  apiCreateLinktreeInputSchema.partial();

export type ApiUpdateLinktreeInput = Partial<ApiCreateLinktreeInput>;

export const apiCreateLinktreeItemInputSchema = z.object({
  name: z.string().trim().min(1),
  link: z.url(),
});

export type ApiCreateLinktreeItemInput = z.infer<
  typeof apiCreateLinktreeItemInputSchema
>;

export const apiUpdateLinktreeItemInputSchema =
  apiCreateLinktreeItemInputSchema.partial();

export type ApiUpdateLinktreeItemInput = Partial<ApiCreateLinktreeItemInput>;
