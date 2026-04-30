DROP INDEX `ra_user_created_idx`;--> statement-breakpoint
ALTER TABLE `fileMetadata` ADD `generationId` text REFERENCES generations(id);