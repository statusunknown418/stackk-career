ALTER TABLE `resume_analyses` ADD `rubricVersion` text;--> statement-breakpoint
ALTER TABLE `resume_analyses` ADD `editStatuses` text DEFAULT '{}' NOT NULL;