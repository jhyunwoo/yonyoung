PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`cover_image_url` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activities`(
	"id",
	"title",
	"description",
	"start_date",
	"end_date",
	"cover_image_url",
	"generation_id",
	"created_at",
	"updated_at",
	"deleted_at"
) SELECT
	id,
	title,
	description,
	activity_date,
	activity_date,
	cover_image_url,
	generation_id,
	created_at,
	updated_at,
	deleted_at
FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `activities_generation_id_idx` ON `activities` (`generation_id`);--> statement-breakpoint
CREATE INDEX `activities_start_date_idx` ON `activities` (`start_date`);--> statement-breakpoint
CREATE INDEX `activities_end_date_idx` ON `activities` (`end_date`);--> statement-breakpoint
