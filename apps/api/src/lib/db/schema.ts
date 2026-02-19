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
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
    .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
    .default(nowTimestamp)
    .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
    .notNull(),
  familyName: text("family_name"),
  givenName: text("given_name"),
  college: text("college"),
  department: text("department"),
  studentNumber: text("student_number"),
  phoneNumber: text("phone_number"),
  role: text("role").default("unverified"),
  generationId: text("generation_id").references(/** text("generation_id").references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id, {
    onDelete: "set null",
  }),
  latestGenerationSortOrder: integer("latest_generation_sort_order"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
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
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, { onDelete: "cascade" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, { onDelete: "cascade" }),
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
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("user_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }),
    aaguid: text("aaguid"),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("generation_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("activity_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => activities.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("generation_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => generations.id),
    place: text("place").notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    description: text("description").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
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
      .references(/** text("exhibition_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => exhibitions.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate(/** integer("updated_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .$onUpdate 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [
    index("exhibition_images_exhibition_id_idx").on(table.exhibitionId),
    index("exhibition_images_sort_order_idx").on(table.sortOrder),
  ],
);

export const linktree = sqliteTable("linktree", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const linktreeItems = sqliteTable(
  "linktree_items",
  {
    id: text("id").primaryKey(),
    linktreeId: text("linktree_id")
      .notNull()
      .references(/** text("linktree_id")
      .notNull()
      .references 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => linktree.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    link: text("link").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
    /**
   * sqliteTable 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param table 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  (table) => [index("linktree_items_linktree_id_idx").on(table.linktreeId)],
);

export const generationsRelations = relations(generations, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many }) => ({
  users: many(user),
  activities: many(activities),
  exhibitions: many(exhibitions),
}));

export const userRelations = relations(user, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [user.generationId],
    references: [generations.id],
  }),
  sessions: many(session),
  accounts: many(account),
  passkeys: many(passkey),
}));

export const sessionRelations = relations(session, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const passkeyRelations = relations(passkey, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));

export const activitiesRelations = relations(activities, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [activities.generationId],
    references: [generations.id],
  }),
  detailImages: many(activityImages),
}));

export const activityImagesRelations = relations(activityImages, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  activity: one(activities, {
    fields: [activityImages.activityId],
    references: [activities.id],
  }),
}));

export const exhibitionsRelations = relations(exhibitions, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many, one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many, one }) => ({
  generation: one(generations, {
    fields: [exhibitions.generationId],
    references: [generations.id],
  }),
  detailImages: many(exhibitionImages),
}));

export const exhibitionImagesRelations = relations(
  exhibitionImages,
    /**
   * relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
   * @param { one } 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
   */
  ({ one }) => ({
    exhibition: one(exhibitions, {
      fields: [exhibitionImages.exhibitionId],
      references: [exhibitions.id],
    }),
  }),
);

export const linktreeRelations = relations(linktree, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { many } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ many }) => ({
  items: many(linktreeItems),
}));

export const linktreeItemsRelations = relations(linktreeItems, /** relations 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param { one } 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ({ one }) => ({
  linktree: one(linktree, {
    fields: [linktreeItems.linktreeId],
    references: [linktree.id],
  }),
}));
