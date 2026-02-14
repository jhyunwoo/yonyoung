PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`activity_date` integer NOT NULL,
	`cover_image_url` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "title", "description", "activity_date", "cover_image_url", "generation_id", "created_at", "updated_at") SELECT "id", "title", "description", "activity_date", "cover_image_url", "generation_id", "created_at", "updated_at" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `activities_generation_id_idx` ON `activities` (`generation_id`);--> statement-breakpoint
CREATE INDEX `activities_activity_date_idx` ON `activities` (`activity_date`);--> statement-breakpoint
CREATE TABLE `__new_exhibitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`generation_id` text NOT NULL,
	`place` text NOT NULL,
	`cover_image_url` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exhibitions`("id", "title", "start_date", "end_date", "generation_id", "place", "cover_image_url", "description", "created_at", "updated_at") SELECT "id", "title", "start_date", "end_date", "generation_id", "place", "cover_image_url", "description", "created_at", "updated_at" FROM `exhibitions`;--> statement-breakpoint
DROP TABLE `exhibitions`;--> statement-breakpoint
ALTER TABLE `__new_exhibitions` RENAME TO `exhibitions`;--> statement-breakpoint
CREATE INDEX `exhibitions_generation_id_idx` ON `exhibitions` (`generation_id`);--> statement-breakpoint
CREATE INDEX `exhibitions_start_date_idx` ON `exhibitions` (`start_date`);--> statement-breakpoint
CREATE INDEX `exhibitions_end_date_idx` ON `exhibitions` (`end_date`);--> statement-breakpoint
CREATE TABLE `__new_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_generations`("id", "name", "sort_order", "start_date", "end_date", "created_at", "updated_at") SELECT "id", "name", "sort_order", "start_date", "end_date", "created_at", "updated_at" FROM `generations`;--> statement-breakpoint
DROP TABLE `generations`;--> statement-breakpoint
ALTER TABLE `__new_generations` RENAME TO `generations`;--> statement-breakpoint
CREATE UNIQUE INDEX `generations_sort_order_unique` ON `generations` (`sort_order`);--> statement-breakpoint
CREATE INDEX `generations_start_date_idx` ON `generations` (`start_date`);--> statement-breakpoint
CREATE TABLE `__new_supporters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`logo_url` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_supporters`("id", "name", "link", "logo_url", "expires_at", "created_at", "updated_at") SELECT "id", "name", "link", "logo_url", "expires_at", "created_at", "updated_at" FROM `supporters`;--> statement-breakpoint
DROP TABLE `supporters`;--> statement-breakpoint
ALTER TABLE `__new_supporters` RENAME TO `supporters`;--> statement-breakpoint
CREATE INDEX `supporters_expires_at_idx` ON `supporters` (`expires_at`);