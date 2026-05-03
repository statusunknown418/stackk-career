DROP TABLE `usage_events`;--> statement-breakpoint
DROP INDEX `resume_analyses_generationId_unique`;--> statement-breakpoint
DROP INDEX `ra_status_idx`;--> statement-breakpoint
ALTER TABLE `resume_analyses` ADD `parentAnalysisId` text REFERENCES resume_analyses(id);--> statement-breakpoint
CREATE INDEX `ra_gen_idx` ON `resume_analyses` (`generationId`);--> statement-breakpoint
CREATE INDEX `ra_parent_idx` ON `resume_analyses` (`parentAnalysisId`);--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "files_userId";--> statement-breakpoint
DROP INDEX "generation_owner_id_idx";--> statement-breakpoint
DROP INDEX "messages_gen_created_idx";--> statement-breakpoint
DROP INDEX "messages_analysis_idx";--> statement-breakpoint
DROP INDEX "ra_resume_idx";--> statement-breakpoint
DROP INDEX "ra_gen_idx";--> statement-breakpoint
DROP INDEX "ra_parent_idx";--> statement-breakpoint
DROP INDEX "blocks_resumeId_idx";--> statement-breakpoint
DROP INDEX "blocks_parentId_idx";--> statement-breakpoint
DROP INDEX "blocks_sourceId_idx";--> statement-breakpoint
DROP INDEX "resume_isPrimary_idx";--> statement-breakpoint
DROP INDEX "resume_generationId_idx";--> statement-breakpoint
DROP INDEX "resume_userId_idx";--> statement-breakpoint
ALTER TABLE `messages` ALTER COLUMN "content" TO "content" text;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `files_userId` ON `fileMetadata` (`userId`);--> statement-breakpoint
CREATE INDEX `generation_owner_id_idx` ON `generations` (`owner`);--> statement-breakpoint
CREATE INDEX `messages_gen_created_idx` ON `messages` (`generationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_analysis_idx` ON `messages` (`analysisId`);--> statement-breakpoint
CREATE INDEX `ra_resume_idx` ON `resume_analyses` (`resumeId`);--> statement-breakpoint
CREATE INDEX `blocks_resumeId_idx` ON `resumeBlocks` (`resumeId`);--> statement-breakpoint
CREATE INDEX `blocks_parentId_idx` ON `resumeBlocks` (`parentBlockId`);--> statement-breakpoint
CREATE INDEX `blocks_sourceId_idx` ON `resumeBlocks` (`sourceBlockId`);--> statement-breakpoint
CREATE INDEX `resume_isPrimary_idx` ON `resumes` (`isPrimary`);--> statement-breakpoint
CREATE INDEX `resume_generationId_idx` ON `resumes` (`generationId`);--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resumes` (`userId`);--> statement-breakpoint
ALTER TABLE `messages` ADD `analysisId` text REFERENCES resume_analyses(id);