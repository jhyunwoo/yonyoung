CREATE TABLE `market_items` (
  `id` text PRIMARY KEY NOT NULL,
  `seller_id` text NOT NULL,
  `name` text NOT NULL,
  `manufacturer` text,
  `product_code` text,
  `condition_grade` text,
  `description` text,
  `price` integer NOT NULL,
  `status` text DEFAULT 'selling' NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `market_items_status_created_idx` ON `market_items` (`status`, `created_at`, `deleted_at`);
--> statement-breakpoint
CREATE INDEX `market_items_seller_deleted_idx` ON `market_items` (`seller_id`, `deleted_at`);
--> statement-breakpoint

CREATE TABLE `market_item_images` (
  `id` text PRIMARY KEY NOT NULL,
  `item_id` text NOT NULL,
  `image_url` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`item_id`) REFERENCES `market_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `market_item_images_item_sort_idx` ON `market_item_images` (`item_id`, `sort_order`);
--> statement-breakpoint

CREATE TABLE `market_comments` (
  `id` text PRIMARY KEY NOT NULL,
  `item_id` text NOT NULL,
  `author_id` text NOT NULL,
  `content` text NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `deleted_at` integer,
  FOREIGN KEY (`item_id`) REFERENCES `market_items`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE INDEX `market_comments_item_created_idx` ON `market_comments` (`item_id`, `created_at`, `deleted_at`);
--> statement-breakpoint
CREATE INDEX `market_comments_author_deleted_idx` ON `market_comments` (`author_id`, `deleted_at`);
--> statement-breakpoint

CREATE TABLE `market_push_subscriptions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth` text NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX `market_push_subscriptions_endpoint_unique` ON `market_push_subscriptions` (`endpoint`);
--> statement-breakpoint
CREATE INDEX `market_push_subscriptions_user_idx` ON `market_push_subscriptions` (`user_id`);
