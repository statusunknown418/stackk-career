PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`templateId` text,
	`generationId` text NOT NULL,
	`userId` text NOT NULL,
	`targetedCompanyIdentifier` text,
	`isPrimary` integer DEFAULT false NOT NULL,
	`aiMetadata` blob,
	`status` text DEFAULT 'draft' NOT NULL,
	`displayName` text DEFAULT 'Nuevo CV' NOT NULL,
	`title` text DEFAULT 'Jon Doe' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`generationId`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_resumes`("id", "templateId", "generationId", "userId", "targetedCompanyIdentifier", "isPrimary", "aiMetadata", "status", "displayName", "title", "createdAt", "updatedAt") SELECT "id", "templateId", "generationId", "userId", "targetedCompanyIdentifier", "isPrimary", "aiMetadata", "status", "displayName", "title", "createdAt", "updatedAt" FROM `resumes`;--> statement-breakpoint
DROP TABLE `resumes`;--> statement-breakpoint
ALTER TABLE `__new_resumes` RENAME TO `resumes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `resume_isPrimary_idx` ON `resumes` (`isPrimary`);--> statement-breakpoint
CREATE INDEX `resume_generationId_idx` ON `resumes` (`generationId`);--> statement-breakpoint
CREATE INDEX `resume_userId_idx` ON `resumes` (`userId`);