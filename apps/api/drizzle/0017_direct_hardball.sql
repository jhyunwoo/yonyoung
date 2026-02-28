CREATE INDEX IF NOT EXISTS "activities_deleted_start_date_idx"
  ON "activities" ("deleted_at", "start_date" DESC);

CREATE INDEX IF NOT EXISTS "activities_generation_deleted_start_idx"
  ON "activities" ("generation_id", "deleted_at", "start_date");

CREATE INDEX IF NOT EXISTS "exhibitions_deleted_start_date_idx"
  ON "exhibitions" ("deleted_at", "start_date" DESC);

CREATE INDEX IF NOT EXISTS "exhibitions_generation_deleted_start_idx"
  ON "exhibitions" ("generation_id", "deleted_at", "start_date");

CREATE INDEX IF NOT EXISTS "supporters_deleted_expires_idx"
  ON "supporters" ("deleted_at", "expires_at");

CREATE INDEX IF NOT EXISTS "user_deleted_created_at_idx"
  ON "user" ("deleted_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "generation_notices_generation_deleted_created_idx"
  ON "generation_notices" ("generation_id", "deleted_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "global_notices_deleted_created_idx"
  ON "global_notices" ("deleted_at", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "linktree_items_linktree_deleted_updated_idx"
  ON "linktree_items" ("linktree_id", "deleted_at", "updated_at" DESC);

PRAGMA optimize;
