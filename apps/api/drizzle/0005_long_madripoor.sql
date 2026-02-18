ALTER TABLE `activities` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `activity_images` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `exhibition_images` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `generations` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `linktree` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `linktree_items` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `supporters` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `deleted_at` integer;