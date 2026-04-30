CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
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
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `fileMetadata` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`metadata` blob,
	`storageId` text,
	`userId` text NOT NULL,
	`createdAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `files_userId` ON `fileMetadata` (`userId`);--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text,
	`title` text,
	`summary` text,
	`model` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`owner`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `generation_owner_id_idx` ON `generations` (`owner`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`generationId` text,
	`parentMessageId` text,
	`content` blob,
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
	FOREIGN KEY (`generationId`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `onboarding_profile` (
	`userId` text PRIMARY KEY NOT NULL,
	`experience` text,
	`industry` text,
	`targetRole` text,
	`urgency` text,
	`location` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resume_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`generationId` text NOT NULL,
	`userId` text NOT NULL,
	`resumeId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`model` text,
	`object` blob,
	`error` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`generationId`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resumeId`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_analyses_generationId_unique` ON `resume_analyses` (`generationId`);--> statement-breakpoint
CREATE INDEX `ra_user_created_idx` ON `resume_analyses` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ra_status_idx` ON `resume_analyses` (`status`);--> statement-breakpoint
CREATE INDEX `ra_resume_idx` ON `resume_analyses` (`resumeId`);--> statement-breakpoint
CREATE TABLE `resumeBlocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resumeId` text NOT NULL,
	`parentBlockId` integer,
	`sourceBlockId` text,
	`version` integer DEFAULT 1 NOT NULL,
	`blockType` text DEFAULT 'section' NOT NULL,
	`position` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`resumeId`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blocks_resumeId_idx` ON `resumeBlocks` (`resumeId`);--> statement-breakpoint
CREATE INDEX `blocks_parentId_idx` ON `resumeBlocks` (`parentBlockId`);--> statement-breakpoint
CREATE INDEX `blocks_sourceId_idx` ON `resumeBlocks` (`sourceBlockId`);--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`templateId` text,
	`generationId` text,
	`userId` text NOT NULL,
	`targetedCompanyIdentifier` text,
	`isPrimary` integer DEFAULT false NOT NULL,
	`aiMetadata` blob,
	`status` text DEFAULT 'draft' NOT NULL,
	`displayName` text DEFAULT 'Nuevo CV' NOT NULL,
	`title` text DEFAULT 'Jon Doe' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resume_isPrimary_idx` ON `resumes` (`isPrimary`);--> statement-breakpoint
CREATE INDEX `resume_generationId_idx` ON `resumes` (`generationId`);--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resumes` (`userId`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`generationId` text,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`inputTokens` integer DEFAULT 0 NOT NULL,
	`outputTokens` integer DEFAULT 0 NOT NULL,
	`metadata` blob,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`generationId`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `usage_events_user_created_idx` ON `usage_events` (`userId`,`createdAt`);