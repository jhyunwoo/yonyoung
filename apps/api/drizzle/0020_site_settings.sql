CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`footer_open_chat_url` text NOT NULL,
	`footer_instagram_id` text NOT NULL,
	`footer_email` text NOT NULL,
	`footer_phone` text NOT NULL,
	`footer_address` text NOT NULL,
	`donate_bank_name` text NOT NULL,
	`donate_account_number` text NOT NULL,
	`donate_account_holder` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `site_settings` (
	`id`,
	`footer_open_chat_url`,
	`footer_instagram_id`,
	`footer_email`,
	`footer_phone`,
	`footer_address`,
	`donate_bank_name`,
	`donate_account_number`,
	`donate_account_holder`
) VALUES (
	'default',
	'https://open.kakao.com/o/snVWZ4th',
	'yonyongpage',
	'kimse0604@naver.com',
	'010-6814-1800',
	'서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호',
	'예시은행',
	'123-456-789012',
	'연영회'
)
ON CONFLICT(`id`) DO NOTHING;
