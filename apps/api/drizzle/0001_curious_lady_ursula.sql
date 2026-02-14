CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`activity_date` text NOT NULL,
	`cover_image_url` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activities_generation_id_idx` ON `activities` (`generation_id`);--> statement-breakpoint
CREATE INDEX `activities_activity_date_idx` ON `activities` (`activity_date`);--> statement-breakpoint
CREATE TABLE `activity_images` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_images_activity_id_idx` ON `activity_images` (`activity_id`);--> statement-breakpoint
CREATE INDEX `activity_images_sort_order_idx` ON `activity_images` (`sort_order`);--> statement-breakpoint
CREATE TABLE `exhibition_images` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibition_id` text NOT NULL,
	`image_url` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`exhibition_id`) REFERENCES `exhibitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exhibition_images_exhibition_id_idx` ON `exhibition_images` (`exhibition_id`);--> statement-breakpoint
CREATE INDEX `exhibition_images_sort_order_idx` ON `exhibition_images` (`sort_order`);--> statement-breakpoint
CREATE TABLE `exhibitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`generation_id` text NOT NULL,
	`place` text NOT NULL,
	`cover_image_url` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `exhibitions_generation_id_idx` ON `exhibitions` (`generation_id`);--> statement-breakpoint
CREATE INDEX `exhibitions_start_date_idx` ON `exhibitions` (`start_date`);--> statement-breakpoint
CREATE INDEX `exhibitions_end_date_idx` ON `exhibitions` (`end_date`);--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generations_sort_order_unique` ON `generations` (`sort_order`);--> statement-breakpoint
CREATE INDEX `generations_start_date_idx` ON `generations` (`start_date`);--> statement-breakpoint
CREATE TABLE `supporters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	`logo_url` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `supporters_expires_at_idx` ON `supporters` (`expires_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `generation_id` text REFERENCES generations(id);