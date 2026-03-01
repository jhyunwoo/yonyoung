CREATE TABLE `recruiting_plans` (
  `year` integer PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `content` text NOT NULL,
  `promotion_image_urls` text NOT NULL,
  `recruitment_start_at` integer NOT NULL,
  `recruitment_end_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
