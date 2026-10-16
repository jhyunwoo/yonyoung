CREATE TABLE `analytics_pending_engagement` (
	`pageview_id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`engaged_ms` integer NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analytics_pending_engagement_received_at_idx` ON `analytics_pending_engagement` (`received_at`);