CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`subscriptionId` text,
	`provider` text NOT NULL,
	`providerEventId` text,
	`eventType` text NOT NULL,
	`payload` blob,
	`processedAt` integer,
	`error` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subscriptionId`) REFERENCES `user_subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_events_provider_event_unique` ON `billing_events` (`provider`,`providerEventId`);--> statement-breakpoint
CREATE INDEX `billing_events_subscription_idx` ON `billing_events` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `billing_events_user_idx` ON `billing_events` (`userId`);--> statement-breakpoint
CREATE INDEX `billing_events_event_type_idx` ON `billing_events` (`eventType`);--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`planId` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`provider` text DEFAULT 'system' NOT NULL,
	`providerCustomerId` text,
	`providerSubscriptionId` text,
	`providerPreapprovalId` text,
	`currentPeriodStart` integer NOT NULL,
	`currentPeriodEnd` integer NOT NULL,
	`cancelAtPeriodEnd` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_subscriptions_user_id_unique` ON `user_subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_status_idx` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_provider_sub_idx` ON `user_subscriptions` (`providerSubscriptionId`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_provider_preapproval_idx` ON `user_subscriptions` (`providerPreapprovalId`);--> statement-breakpoint
ALTER TABLE `generations` ADD `type` text;