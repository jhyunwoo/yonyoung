import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { nowTimestamp } from "./columns";

/** MCP 업로드. 토큰 원문은 저장하지 않고 SHA-256 hex만 둔다. */
export const mcpUploads = sqliteTable(
  "mcp_uploads",
  {
    id: text("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    declaredSize: integer("declared_size").notNull(),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url").notNull(),
    width: integer("width"),
    height: integer("height"),
    reservationId: text("reservation_id"),
    status: text("status").notNull().default("pending"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(nowTimestamp)
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("mcp_uploads_user_created_idx").on(table.userId, table.createdAt),
    index("mcp_uploads_expiry_idx").on(table.expiresAt),
  ],
);
