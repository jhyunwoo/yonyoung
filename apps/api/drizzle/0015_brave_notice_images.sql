ALTER TABLE `generation_notices` ADD `image_urls` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `global_notices` ADD `image_urls` text DEFAULT '[]' NOT NULL;
