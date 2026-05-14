import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const coachingStageEnum = [
	"cv-analysis",
	"pre-interview-training",
	"general-coaching",
	"mock-interview",
	"follow-up",
] as const;

export type CoachingStage = (typeof coachingStageEnum)[number];

export const coachingSessions = sqliteTable(
	"coaching_sessions",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `coach_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		stage: t.text({ enum: coachingStageEnum }).notNull(),
		calBookingUid: t.text().notNull().unique(),
		calLink: t.text().notNull(),
		calEventTypeId: integer(),
		calEventTypeSlug: t.text(),
		title: t.text(),
		bookingStatus: t.text().notNull().default("confirmed"),
		startsAt: t.integer({ mode: "timestamp" }),
		endsAt: t.integer({ mode: "timestamp" }),
		videoCallUrl: t.text(),
		createdAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: t
			.integer({ mode: "timestamp" })
			.$defaultFn(() => new Date())
			.$onUpdateFn(() => new Date())
			.notNull(),
	}),
	(t) => [index("coaching_sessions_user_idx").on(t.userId), index("coaching_sessions_stage_idx").on(t.userId, t.stage)]
);

export const coachingSessionsRelations = relations(coachingSessions, ({ one }) => ({
	user: one(user, {
		fields: [coachingSessions.userId],
		references: [user.id],
	}),
}));
