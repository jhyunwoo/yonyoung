CREATE TABLE `linktree` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `linktree_items` (
	`id` text PRIMARY KEY NOT NULL,
	`linktree_id` text NOT NULL,
	`name` text NOT NULL,
	`link` text NOT NULL,
	FOREIGN KEY (`linktree_id`) REFERENCES `linktree`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `linktree_items_linktree_id_idx` ON `linktree_items` (`linktree_id`);