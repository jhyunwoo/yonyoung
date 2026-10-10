CREATE TABLE `page_view_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`dimension` text NOT NULL,
	`value` text NOT NULL,
	`entry_count` integer DEFAULT 1 NOT NULL,
	`visited_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `page_view_entries_dimension_visited_at_idx` ON `page_view_entries` (`dimension`,`visited_at`);