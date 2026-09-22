-- Better Auth 1.7은 account 모델에 필수 컬럼 `issuer`와 (issuer, account_id) 고유 인덱스를 추가했다.
-- SQLite는 기존 행이 있는 테이블에 DEFAULT 없는 NOT NULL 컬럼을 ALTER ... ADD로 붙일 수 없으므로,
-- drizzle이 생성한 `ALTER TABLE account ADD issuer text NOT NULL` 대신 테이블 재생성으로 백필한다.
-- 최종 스키마는 0009 스냅샷과 동일하다.
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- issuer 백필 값은 Better Auth가 신규 계정에 기록하는 값과 일치해야 기존 계정이 재사용된다.
--   google      -> 소셜 프로바이더가 선언한 accountIssuer("https://accounts.google.com")
--   credential  -> createLocalAccountIssuer("credential")
--   그 외        -> createOAuthAccountIssuer(providerId). 현재 DB에는 google 계정만 존재하므로
--                  방어적 분기이며, 프로바이더 id가 URL 인코딩이 필요 없는 형태임을 전제한다.
INSERT INTO `__new_account` (`id`, `issuer`, `account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at`)
SELECT
	`id`,
	CASE
		WHEN `provider_id` = 'google' THEN 'https://accounts.google.com'
		WHEN `provider_id` = 'credential' THEN 'local:credential'
		ELSE 'local:oauth:' || `provider_id`
	END,
	`account_id`,
	`provider_id`,
	`user_id`,
	`access_token`,
	`refresh_token`,
	`id_token`,
	`access_token_expires_at`,
	`refresh_token_expires_at`,
	`scope`,
	`password`,
	`created_at`,
	`updated_at`
FROM `account`;
--> statement-breakpoint
DROP TABLE `account`;
--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_idx` ON `account` (`issuer`,`account_id`);
