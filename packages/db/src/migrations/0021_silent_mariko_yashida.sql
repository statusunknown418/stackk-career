DROP INDEX `generation_owner_id_idx`;--> statement-breakpoint
ALTER TABLE `generations` ADD `resumeId` text;--> statement-breakpoint
ALTER TABLE `generations` ADD `language` text DEFAULT 'es' NOT NULL;--> statement-breakpoint
CREATE INDEX `generation_owner_type_idx` ON `generations` (`owner`,`type`);--> statement-breakpoint
CREATE INDEX `generation_resume_id_idx` ON `generations` (`resumeId`);