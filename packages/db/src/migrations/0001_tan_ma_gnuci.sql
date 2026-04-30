ALTER TABLE `usage_events` ADD `totalTokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `usage_events` ADD `reasoningTokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `usage_events` DROP COLUMN `generationId`;