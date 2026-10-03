-- Better Auth 1.7.3+ restores account identity to (provider_id, account_id).
-- Create the replacement index first: duplicate identities must abort the migration.
CREATE UNIQUE INDEX `account_providerId_accountId_idx` ON `account` (`provider_id`,`account_id`);
--> statement-breakpoint
DROP INDEX `account_issuer_accountId_idx`;
--> statement-breakpoint
ALTER TABLE `account` DROP COLUMN `issuer`;
