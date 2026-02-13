import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const idSchema = z.coerce.number().int().positive();

export const linkCategorySchema = z.enum([
  "promotion",
  "inquiry",
  "activity",
  "sponsor",
  "private",
]);

export const createActivitySchema = z.object({
  title: nonEmptyString.max(160),
  date: nonEmptyString.max(50),
  coverImageUrl: nonEmptyString,
  images: z.array(nonEmptyString).min(1),
});

export const updateActivitySchema = createActivitySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export const createExhibitionSchema = z.object({
  title: nonEmptyString.max(200),
  date: nonEmptyString.max(100),
  location: nonEmptyString.max(200),
  description: z.string().max(2000).default(""),
  coverImageUrl: nonEmptyString,
  images: z.array(nonEmptyString).min(1),
});

export const updateExhibitionSchema = createExhibitionSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export const photographerTypeSchema = z.enum(["정회원", "준회원"]);

export const createPhotographerSchema = z.object({
  generation: nonEmptyString.max(20),
  name: nonEmptyString.max(120),
  type: photographerTypeSchema,
  email: z.string().email().or(z.literal("")),
  instagram: z.string().url().or(z.literal("")),
  website: z.string().url().or(z.literal("")),
  mainPhotoUrl: z.string().default(""),
  works: z.array(z.string()).max(10),
});

export const updatePhotographerSchema = createPhotographerSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export const createLinkSchema = z.object({
  name: nonEmptyString.max(120),
  url: z.string().url(),
  category: linkCategorySchema,
  icon: z.string().max(20).default(""),
  order: z.number().int().nonnegative().default(0),
});

export const updateLinkSchema = createLinkSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "at least one field is required",
});

export const sitePageSlugSchema = z.enum(["about", "recruiting", "donate", "supporters"]);
export const idParamSchema = z.object({ id: idSchema });
export const sitePageSlugParamSchema = z.object({ slug: sitePageSlugSchema });

export const updatePageSchema = z.object({
  title: nonEmptyString.max(200),
  contentJson: z.unknown(),
});

export const updateHeroSchema = z.object({
  backgroundImageUrl: nonEmptyString,
});

export const uploadAssetSchema = z.object({
  entity: nonEmptyString.max(50),
  entityId: z.number().int().positive().optional(),
});

export const paginationQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const timestampString = z.string().min(1);

export const assetUploadResponseSchema = z.object({
  key: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative()
});

export const activityResponseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  date: z.string(),
  coverImageUrl: z.string(),
  images: z.array(z.string()),
  createdAt: timestampString,
  updatedAt: timestampString
});

export const exhibitionResponseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  date: z.string(),
  location: z.string(),
  description: z.string(),
  coverImageUrl: z.string(),
  images: z.array(z.string()),
  createdAt: timestampString,
  updatedAt: timestampString
});

export const photographerResponseSchema = z.object({
  id: z.number().int().positive(),
  generation: z.string(),
  name: z.string(),
  type: photographerTypeSchema,
  email: z.string(),
  instagram: z.string(),
  website: z.string(),
  mainPhotoUrl: z.string(),
  works: z.array(z.string()),
  createdAt: timestampString,
  updatedAt: timestampString
});

export const photographerGroupResponseSchema = z.object({
  generation: z.string(),
  members: z.array(photographerResponseSchema)
});

export const linktreeLinkResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  url: z.string(),
  category: linkCategorySchema,
  icon: z.string(),
  order: z.number().int().nonnegative(),
  createdAt: timestampString,
  updatedAt: timestampString
});

export const sitePageResponseSchema = z.object({
  slug: sitePageSlugSchema,
  title: z.string(),
  contentJson: z.unknown(),
  updatedAt: timestampString
});

export const heroResponseSchema = z.object({
  backgroundImageUrl: z.string(),
  updatedAt: timestampString
});

export const deletedResponseSchema = z.object({
  deleted: z.literal(true)
});

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  now: z.string().datetime()
});

export const errorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.unknown().optional()
  })
});

export function dataEnvelopeSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema });
}

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type CreateExhibitionInput = z.infer<typeof createExhibitionSchema>;
export type UpdateExhibitionInput = z.infer<typeof updateExhibitionSchema>;
export type CreatePhotographerInput = z.infer<typeof createPhotographerSchema>;
export type UpdatePhotographerInput = z.infer<typeof updatePhotographerSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type UpdateHeroInput = z.infer<typeof updateHeroSchema>;
export type ActivityResponse = z.infer<typeof activityResponseSchema>;
export type ExhibitionResponse = z.infer<typeof exhibitionResponseSchema>;
export type PhotographerResponse = z.infer<typeof photographerResponseSchema>;
export type PhotographerGroupResponse = z.infer<typeof photographerGroupResponseSchema>;
export type LinktreeLinkResponse = z.infer<typeof linktreeLinkResponseSchema>;
export type SitePageResponse = z.infer<typeof sitePageResponseSchema>;
export type HeroResponse = z.infer<typeof heroResponseSchema>;
