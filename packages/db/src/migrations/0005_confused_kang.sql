DROP INDEX `messages_gen_created_idx`;--> statement-breakpoint
CREATE INDEX `messages_gen_idx` ON `messages` (`generationId`);