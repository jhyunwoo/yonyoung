CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`session_id` text NOT NULL,
	`visited_at` integer NOT NULL,
	`page_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`referrer_host` text,
	`device` text NOT NULL,
	`is_member` integer NOT NULL,
	`engaged_ms` integer
);
--> statement-breakpoint
CREATE INDEX `analytics_events_visited_at_idx` ON `analytics_events` (`visited_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_visitor_visited_at_idx` ON `analytics_events` (`visitor_id`,`visited_at`);--> statement-breakpoint
CREATE INDEX `analytics_events_session_idx` ON `analytics_events` (`session_id`);