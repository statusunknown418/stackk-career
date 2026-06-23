CREATE TABLE `resume_job_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`resumeId` text NOT NULL,
	`userId` text NOT NULL,
	`sourceUrl` text NOT NULL,
	`provider` text DEFAULT 'apify' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`title` text,
	`company` text,
	`location` text,
	`employmentType` text,
	`seniority` text,
	`description` text,
	`structured` text,
	`error` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`resumeId`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rjt_resume_idx` ON `resume_job_targets` (`resumeId`);--> statement-breakpoint
CREATE INDEX `rjt_user_idx` ON `resume_job_targets` (`userId`);--> statement-breakpoint
CREATE INDEX `rjt_status_idx` ON `resume_job_targets` (`status`);--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "coaching_sessions_calBookingUid_unique";--> statement-breakpoint
DROP INDEX "coaching_sessions_user_idx";--> statement-breakpoint
DROP INDEX "coaching_sessions_stage_idx";--> statement-breakpoint
DROP INDEX "files_userId";--> statement-breakpoint
DROP INDEX "generation_owner_id_idx";--> statement-breakpoint
DROP INDEX "generation_type_idx";--> statement-breakpoint
DROP INDEX "generation_resume_id_idx";--> statement-breakpoint
DROP INDEX "messages_gen_idx";--> statement-breakpoint
DROP INDEX "messages_analysis_idx";--> statement-breakpoint
DROP INDEX "ra_resume_idx";--> statement-breakpoint
DROP INDEX "ra_gen_idx";--> statement-breakpoint
DROP INDEX "ra_parent_idx";--> statement-breakpoint
DROP INDEX "blocks_resumeId_idx";--> statement-breakpoint
DROP INDEX "blocks_parentId_idx";--> statement-breakpoint
DROP INDEX "blocks_resume_parent_deleted_idx";--> statement-breakpoint
DROP INDEX "blocks_sourceId_idx";--> statement-breakpoint
DROP INDEX "rjt_resume_idx";--> statement-breakpoint
DROP INDEX "rjt_user_idx";--> statement-breakpoint
DROP INDEX "rjt_status_idx";--> statement-breakpoint
DROP INDEX "resume_isPrimary_idx";--> statement-breakpoint
DROP INDEX "resume_generationId_idx";--> statement-breakpoint
DROP INDEX "resume_userId_idx";--> statement-breakpoint
DROP INDEX "billing_events_provider_event_unique";--> statement-breakpoint
DROP INDEX "billing_events_subscription_idx";--> statement-breakpoint
DROP INDEX "billing_events_user_idx";--> statement-breakpoint
DROP INDEX "billing_events_event_type_idx";--> statement-breakpoint
DROP INDEX "user_subscriptions_user_id_unique";--> statement-breakpoint
DROP INDEX "user_subscriptions_status_idx";--> statement-breakpoint
DROP INDEX "user_subscriptions_provider_sub_idx";--> statement-breakpoint
DROP INDEX "transactional_emails_user_type_idx";--> statement-breakpoint
DROP INDEX "waitlist_email";--> statement-breakpoint
ALTER TABLE `waitlist` ALTER COLUMN "phone" TO "phone" text;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE UNIQUE INDEX `coaching_sessions_calBookingUid_unique` ON `coaching_sessions` (`calBookingUid`);--> statement-breakpoint
CREATE INDEX `coaching_sessions_user_idx` ON `coaching_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `coaching_sessions_stage_idx` ON `coaching_sessions` (`userId`,`stage`);--> statement-breakpoint
CREATE INDEX `files_userId` ON `fileMetadata` (`userId`);--> statement-breakpoint
CREATE INDEX `generation_owner_id_idx` ON `generations` (`owner`);--> statement-breakpoint
CREATE INDEX `generation_type_idx` ON `generations` (`type`);--> statement-breakpoint
CREATE INDEX `generation_resume_id_idx` ON `generations` (`resumeId`);--> statement-breakpoint
CREATE INDEX `messages_gen_idx` ON `messages` (`generationId`);--> statement-breakpoint
CREATE INDEX `messages_analysis_idx` ON `messages` (`analysisId`);--> statement-breakpoint
CREATE INDEX `ra_resume_idx` ON `resume_analyses` (`resumeId`);--> statement-breakpoint
CREATE INDEX `ra_gen_idx` ON `resume_analyses` (`generationId`);--> statement-breakpoint
CREATE INDEX `ra_parent_idx` ON `resume_analyses` (`parentAnalysisId`);--> statement-breakpoint
CREATE INDEX `blocks_resumeId_idx` ON `resumeBlocks` (`resumeId`);--> statement-breakpoint
CREATE INDEX `blocks_parentId_idx` ON `resumeBlocks` (`parentBlockId`);--> statement-breakpoint
CREATE INDEX `blocks_resume_parent_deleted_idx` ON `resumeBlocks` (`resumeId`,`parentBlockId`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `blocks_sourceId_idx` ON `resumeBlocks` (`sourceBlockId`);--> statement-breakpoint
CREATE INDEX `resume_isPrimary_idx` ON `resumes` (`isPrimary`);--> statement-breakpoint
CREATE INDEX `resume_generationId_idx` ON `resumes` (`generationId`);--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resumes` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_events_provider_event_unique` ON `billing_events` (`provider`,`providerEventId`);--> statement-breakpoint
CREATE INDEX `billing_events_subscription_idx` ON `billing_events` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `billing_events_user_idx` ON `billing_events` (`userId`);--> statement-breakpoint
CREATE INDEX `billing_events_event_type_idx` ON `billing_events` (`eventType`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_subscriptions_user_id_unique` ON `user_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_status_idx` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_provider_sub_idx` ON `user_subscriptions` (`providerSubscriptionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `transactional_emails_user_type_idx` ON `transactional_emails` (`userId`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email` ON `waitlist` (`email`);