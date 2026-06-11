ALTER TABLE `generations` ADD `resumeId` text;--> statement-breakpoint
ALTER TABLE `generations` ADD `language` text DEFAULT 'es' NOT NULL;--> statement-breakpoint
CREATE INDEX `generation_type_idx` ON `generations` (`type`);--> statement-breakpoint
CREATE INDEX `generation_resume_id_idx` ON `generations` (`resumeId`);