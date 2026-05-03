PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`generationId` text NOT NULL,
	`parentMessageId` text,
	`analysisId` text,
	`content` text,
	`text` text,
	`error` text,
	`model` text,
	`order` integer,
	`toolMeta` blob,
	`isTool` integer,
	`isAssistant` integer DEFAULT false NOT NULL,
	`objectType` text,
	`object` blob,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`generationId`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`analysisId`) REFERENCES `resume_analyses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "generationId", "parentMessageId", "analysisId", "content", "text", "error", "model", "order", "toolMeta", "isTool", "isAssistant", "objectType", "object", "createdAt") SELECT "id", "generationId", "parentMessageId", "analysisId", "content", "text", "error", "model", "order", "toolMeta", "isTool", "isAssistant", "objectType", "object", "createdAt" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `messages_gen_idx` ON `messages` (`generationId`);--> statement-breakpoint
CREATE INDEX `messages_analysis_idx` ON `messages` (`analysisId`);