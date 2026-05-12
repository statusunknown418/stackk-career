CREATE TABLE `coaching_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`stage` text NOT NULL,
	`calBookingUid` text NOT NULL,
	`calLink` text NOT NULL,
	`calEventTypeId` integer,
	`calEventTypeSlug` text,
	`title` text,
	`bookingStatus` text DEFAULT 'confirmed' NOT NULL,
	`startsAt` integer,
	`endsAt` integer,
	`videoCallUrl` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coaching_sessions_calBookingUid_unique` ON `coaching_sessions` (`calBookingUid`);--> statement-breakpoint
CREATE INDEX `coaching_sessions_user_idx` ON `coaching_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `coaching_sessions_stage_idx` ON `coaching_sessions` (`userId`,`stage`);