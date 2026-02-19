CREATE TABLE `user_generations` (
	`user_id` text NOT NULL,
	`generation_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `generation_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_generations_user_id_idx` ON `user_generations` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_generations_generation_id_idx` ON `user_generations` (`generation_id`);
--> statement-breakpoint
INSERT INTO `user_generations` (`user_id`, `generation_id`)
SELECT `id`, `generation_id`
FROM `user`
WHERE `generation_id` IS NOT NULL;
