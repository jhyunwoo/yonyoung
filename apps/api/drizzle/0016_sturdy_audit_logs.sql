ALTER TABLE `linktree` ADD `created_at` integer;
--> statement-breakpoint
ALTER TABLE `linktree` ADD `updated_at` integer;
--> statement-breakpoint
ALTER TABLE `linktree_items` ADD `created_at` integer;
--> statement-breakpoint
ALTER TABLE `linktree_items` ADD `updated_at` integer;
--> statement-breakpoint
UPDATE `linktree`
SET
  `created_at` = COALESCE(`created_at`, cast(unixepoch('subsecond') * 1000 as integer)),
  `updated_at` = COALESCE(`updated_at`, cast(unixepoch('subsecond') * 1000 as integer));
--> statement-breakpoint
UPDATE `linktree_items`
SET
  `created_at` = COALESCE(`created_at`, cast(unixepoch('subsecond') * 1000 as integer)),
  `updated_at` = COALESCE(`updated_at`, cast(unixepoch('subsecond') * 1000 as integer));
--> statement-breakpoint
CREATE TABLE `audit_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `resource_type` text NOT NULL,
  `resource_id` text NOT NULL,
  `action` text NOT NULL,
  `actor_id` text,
  `actor_name` text NOT NULL,
  `actor_role` text,
  `changed_fields` text DEFAULT '[]' NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resource_type`,`resource_id`,`created_at` DESC);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);
--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at` DESC);
