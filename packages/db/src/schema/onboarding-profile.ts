import { relations } from "drizzle-orm";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const onboardingProfile = sqliteTable("onboarding_profile", (t) => ({
	userId: t
		.text()
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	experience: t.text(),
	industry: t.text(),
	targetRole: t.text(),
	urgency: t.text(),
	location: t.text(),

	createdAt: t
		.integer({ mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: t
		.integer({ mode: "timestamp" })
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
		.notNull(),
}));

export const onboardingProfileRelations = relations(onboardingProfile, ({ one }) => ({
	user: one(user, {
		fields: [onboardingProfile.userId],
		references: [user.id],
	}),
}));
