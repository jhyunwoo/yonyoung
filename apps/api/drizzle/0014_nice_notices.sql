CREATE TABLE `generation_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`generation_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `generation_notices_generation_id_idx` ON `generation_notices` (`generation_id`);
--> statement-breakpoint
CREATE INDEX `generation_notices_author_id_idx` ON `generation_notices` (`author_id`);
--> statement-breakpoint
CREATE INDEX `generation_notices_created_at_idx` ON `generation_notices` (`created_at`);
--> statement-breakpoint
CREATE TABLE `global_notices` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `global_notices_author_id_idx` ON `global_notices` (`author_id`);
--> statement-breakpoint
CREATE INDEX `global_notices_created_at_idx` ON `global_notices` (`created_at`);
