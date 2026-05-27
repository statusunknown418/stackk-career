import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const planIdEnum = ["free", "pro", "max"] as const;
export type PlanIdDb = (typeof planIdEnum)[number];

export const subscriptionStatusEnum = ["active", "past_due", "canceled", "expired", "trialing"] as const;
export type SubscriptionStatusDb = (typeof subscriptionStatusEnum)[number];

export const subscriptionProviderEnum = ["system", "mercadopago"] as const;
export type SubscriptionProviderDb = (typeof subscriptionProviderEnum)[number];

export const userSubscriptions = sqliteTable(
	"user_subscriptions",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `sub_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		planId: t.text({ enum: planIdEnum }).notNull().default("free"),
		status: t.text({ enum: subscriptionStatusEnum }).notNull().default("active"),
		provider: t.text({ enum: subscriptionProviderEnum }).notNull().default("system"),

		providerCustomerId: t.text(),
		providerSubscriptionId: t.text(),
		providerPreapprovalId: t.text(),

		currentPeriodStart: t.integer({ mode: "timestamp" }).notNull(),
		currentPeriodEnd: t.integer({ mode: "timestamp" }).notNull(),
		cancelAtPeriodEnd: t.integer({ mode: "boolean" }).notNull().default(false),

		createdAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$onUpdateFn(() => new Date()),
	}),
	(t) => [
		uniqueIndex("user_subscriptions_user_id_unique").on(t.userId),
		index("user_subscriptions_status_idx").on(t.status),
		index("user_subscriptions_provider_sub_idx").on(t.providerSubscriptionId),
		index("user_subscriptions_provider_preapproval_idx").on(t.providerPreapprovalId),
	]
);

export const billingEvents = sqliteTable(
	"billing_events",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `bevt_${createId()}`),
		userId: t.text().references(() => user.id, { onDelete: "set null" }),
		subscriptionId: t.text().references(() => userSubscriptions.id, { onDelete: "set null" }),
		provider: t.text({ enum: subscriptionProviderEnum }).notNull(),
		providerEventId: t.text(),
		eventType: t.text().notNull(),
		payload: t.text({ mode: "json" }),
		processedAt: t.integer({ mode: "timestamp" }),
		error: t.text(),
		createdAt: t
			.integer({ mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	}),
	(t) => [
		uniqueIndex("billing_events_provider_event_unique").on(t.provider, t.providerEventId),
		index("billing_events_subscription_idx").on(t.subscriptionId),
		index("billing_events_user_idx").on(t.userId),
		index("billing_events_event_type_idx").on(t.eventType),
	]
);

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one, many }) => ({
	user: one(user, {
		fields: [userSubscriptions.userId],
		references: [user.id],
	}),
	billingEvents: many(billingEvents),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
	user: one(user, {
		fields: [billingEvents.userId],
		references: [user.id],
	}),
	subscription: one(userSubscriptions, {
		fields: [billingEvents.subscriptionId],
		references: [userSubscriptions.id],
	}),
}));
