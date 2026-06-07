CREATE TABLE `waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`phone` text NOT NULL,
	`email` text,
	`source` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email` ON `waitlist` (`email`);