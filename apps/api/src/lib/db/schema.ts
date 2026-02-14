import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const nowTimestamp = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const generations = sqliteTable(
  "generations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().unique(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("generations_start_date_idx").on(table.startDate)],
);

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  nickname: text("nickname"),
  role: text("role").default("user"),
  generationId: text("generation_id").references(() => generations.id, {
    onDelete: "set null",
  }),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const passkey = sqliteTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    aaguid: text("aaguid"),
  },
  (table) => [
    index("passkey_userId_idx").on(table.userId),
    index("passkey_credentialID_idx").on(table.credentialID),
  ],
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    activityDate: integer("activity_date", { mode: "timestamp_ms" }).notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("activities_generation_id_idx").on(table.generationId),
    index("activities_activity_date_idx").on(table.activityDate),
  ],
);

export const activityImages = sqliteTable(
  "activity_images",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("activity_images_activity_id_idx").on(table.activityId),
    index("activity_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const supporters = sqliteTable(
  "supporters",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    link: text("link").notNull(),
    logoUrl: text("logo_url").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("supporters_expires_at_idx").on(table.expiresAt)],
);

export const exhibitions = sqliteTable(
  "exhibitions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    generationId: text("generation_id")
      .notNull()
      .references(() => generations.id),
    place: text("place").notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    description: text("description").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("exhibitions_generation_id_idx").on(table.generationId),
    index("exhibitions_start_date_idx").on(table.startDate),
    index("exhibitions_end_date_idx").on(table.endDate),
  ],
);

export const exhibitionImages = sqliteTable(
  "exhibition_images",
  {
    id: text("id").primaryKey(),
    exhibitionId: text("exhibition_id")
      .notNull()
      .references(() => exhibitions.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("exhibition_images_exhibition_id_idx").on(table.exhibitionId),
    index("exhibition_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const linktree = sqliteTable("linktree", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const linktreeItems = sqliteTable(
  "linktree_items",
  {
    id: text("id").primaryKey(),
    linktreeId: text("linktree_id")
      .notNull()
      .references(() => linktree.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    link: text("link").notNull(),
  },
  (table) => [index("linktree_items_linktree_id_idx").on(table.linktreeId)],
);

export const generationsRelations = relations(generations, ({ many }) => ({
  users: many(user),
  activities: many(activities),
  exhibitions: many(exhibitions),
}));

export const userRelations = relations(user, ({ many, one }) => ({
  generation: one(generations, {
    fields: [user.generationId],
    references: [generations.id],
  }),
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ many, one }) => ({
  generation: one(generations, {
    fields: [activities.generationId],
    references: [generations.id],
  }),
  detailImages: many(activityImages),
}));

export const activityImagesRelations = relations(activityImages, ({ one }) => ({
  activity: one(activities, {
    fields: [activityImages.activityId],
    references: [activities.id],
  }),
}));

export const exhibitionsRelations = relations(exhibitions, ({ many, one }) => ({
  generation: one(generations, {
    fields: [exhibitions.generationId],
    references: [generations.id],
  }),
  detailImages: many(exhibitionImages),
}));

export const exhibitionImagesRelations = relations(
  exhibitionImages,
  ({ one }) => ({
    exhibition: one(exhibitions, {
      fields: [exhibitionImages.exhibitionId],
      references: [exhibitions.id],
    }),
  }),
);

export const linktreeRelations = relations(linktree, ({ many }) => ({
  items: many(linktreeItems),
}));

export const linktreeItemsRelations = relations(linktreeItems, ({ one }) => ({
  linktree: one(linktree, {
    fields: [linktreeItems.linktreeId],
    references: [linktree.id],
  }),
}));
