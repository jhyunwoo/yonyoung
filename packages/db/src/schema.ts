import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

const currentTimestamp = sql`(CURRENT_TIMESTAMP)`;

export const appMigrations = sqliteTable("app_migrations", {
  id: text("id").primaryKey(),
  appliedAt: text("applied_at").notNull()
});

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(currentTimestamp)
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  coverImageUrl: text("cover_image_url").notNull(),
  imagesJson: text("images_json").notNull(),
  createdAt: text("created_at").notNull().default(currentTimestamp),
  updatedAt: text("updated_at").notNull().default(currentTimestamp)
});

export const exhibitions = sqliteTable("exhibitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  location: text("location").notNull(),
  description: text("description").notNull().default(""),
  coverImageUrl: text("cover_image_url").notNull(),
  imagesJson: text("images_json").notNull(),
  createdAt: text("created_at").notNull().default(currentTimestamp),
  updatedAt: text("updated_at").notNull().default(currentTimestamp)
});

export const photographers = sqliteTable(
  "photographers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    generation: text("generation").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    email: text("email").notNull().default(""),
    instagram: text("instagram").notNull().default(""),
    website: text("website").notNull().default(""),
    mainPhotoUrl: text("main_photo_url").notNull().default(""),
    worksJson: text("works_json").notNull(),
    createdAt: text("created_at").notNull().default(currentTimestamp),
    updatedAt: text("updated_at").notNull().default(currentTimestamp)
  },
  (table) => [
    uniqueIndex("photographers_generation_name_idx").on(
      table.generation,
      table.name
    )
  ]
);

export const linktreeLinks = sqliteTable("linktree_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull().default(""),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(currentTimestamp),
  updatedAt: text("updated_at").notNull().default(currentTimestamp)
});

export const sitePages = sqliteTable("site_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  contentJson: text("content_json").notNull(),
  updatedAt: text("updated_at").notNull().default(currentTimestamp)
});

export const heroSettings = sqliteTable("hero_settings", {
  id: integer("id").primaryKey(),
  backgroundImageUrl: text("background_image_url").notNull(),
  updatedAt: text("updated_at").notNull().default(currentTimestamp)
});

export const adminRoles = sqliteTable("admin_roles", {
  userId: text("user_id").primaryKey(),
  role: text("role").notNull(),
  grantedAt: text("granted_at").notNull().default(currentTimestamp)
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  detailJson: text("detail_json"),
  createdAt: text("created_at").notNull().default(currentTimestamp)
});
