import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

/**
 * Lifecycle of a per-user job-suggestion compute run, fanned out one-per-user
 * from the daily dispatcher schedule:
 * `pending` (row created by the dispatcher, task queued) -> `running` (context
 * load + provider search + rank in flight) -> `ready` (suggestions upserted) |
 * `failed` (provider/ranker error; the user keeps any previously `ready`
 * suggestions and is retried on the next eligible cycle).
 */
export const jobSuggestionRunStatusEnum = ["pending", "running", "ready", "failed"] as const;
export type JobSuggestionRunStatus = (typeof jobSuggestionRunStatusEnum)[number];

/**
 * Refresh cadence the run was scheduled under. Storage-level mirror of the
 * canonical `jobSuggestionCadenceEnum` in `@stackk-career/schemas/subscriptions`
 * (kept inline to avoid a schemas -> db import cycle, same pattern as the
 * duplicated `planIdEnum` between this package and the schemas package).
 */
export const jobSuggestionCadenceDbEnum = ["daily", "monthly"] as const;

/**
 * Suggested job listings surfaced to a user, sourced by a background compute run
 * from a job provider (initially LinkedIn via Apify). One row per
 * `(userId, source, sourceJobId)` — reruns `onConflictDoUpdate` refresh the
 * score/metadata rather than duplicating. `structured` holds the normalized
 * {@link JobListing} payload (validated via the zod mirror in
 * `@stackk-career/schemas/jobs/job-discovery`).
 */
export const suggestedJobStatusEnum = ["ready", "dismissed", "expired"] as const;
export type SuggestedJobStatus = (typeof suggestedJobStatusEnum)[number];

/**
 * Per-user run ledger. Drives cadence enforcement (the dispatcher reads the
 * latest `completedAt` to decide who is due), idempotency, and observability
 * (fetched/kept counts, error, timing). Mirrors the run-ledger discipline used
 * by the engagement nudge (`transactional_emails`) and the single-job
 * `resume_job_targets` status machine.
 */
export const jobSuggestionRuns = sqliteTable(
	"job_suggestion_runs",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `sjrun_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		status: t.text({ enum: jobSuggestionRunStatusEnum }).notNull().default("pending"),
		source: t.text().notNull().default("linkedin"),
		cadence: t.text({ enum: jobSuggestionCadenceDbEnum }).notNull(),

		fetchedCount: t.integer().notNull().default(0),
		keptCount: t.integer().notNull().default(0),
		error: t.text(),

		startedAt: t.integer({ mode: "timestamp" }),
		completedAt: t.integer({ mode: "timestamp" }),

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
		index("sjrun_user_idx").on(t.userId),
		index("sjrun_user_completed_idx").on(t.userId, t.completedAt),
		index("sjrun_status_idx").on(t.status),
	]
);

export const suggestedJobs = sqliteTable(
	"suggested_jobs",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `sjob_${createId()}`),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		runId: t.text().references(() => jobSuggestionRuns.id, { onDelete: "set null" }),

		source: t.text().notNull().default("linkedin"),
		sourceJobId: t.text().notNull(),
		url: t.text().notNull(),

		title: t.text(),
		company: t.text(),
		location: t.text(),
		employmentType: t.text(),
		seniority: t.text(),
		postedAt: t.integer({ mode: "timestamp" }),

		matchScore: t.integer().notNull().default(0),
		matchReasons: t.text({ mode: "json" }).$type<string[]>(),
		// Normalized JobListing (title/company/skills/keywords/summary). Untyped JSON
		// column on purpose — validated through the zod schema in the schemas package,
		// mirroring how `resume_job_targets.structured` is persisted.
		structured: t.text({ mode: "json" }),

		status: t.text({ enum: suggestedJobStatusEnum }).notNull().default("ready"),

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
		uniqueIndex("sjob_user_source_job_idx").on(t.userId, t.source, t.sourceJobId),
		index("sjob_user_idx").on(t.userId),
		index("sjob_status_idx").on(t.status),
		index("sjob_user_score_idx").on(t.userId, t.matchScore),
	]
);

export const jobSuggestionRunsRelations = relations(jobSuggestionRuns, ({ one, many }) => ({
	user: one(user, {
		fields: [jobSuggestionRuns.userId],
		references: [user.id],
	}),
	suggestions: many(suggestedJobs),
}));

export const suggestedJobsRelations = relations(suggestedJobs, ({ one }) => ({
	user: one(user, {
		fields: [suggestedJobs.userId],
		references: [user.id],
	}),
	run: one(jobSuggestionRuns, {
		fields: [suggestedJobs.runId],
		references: [jobSuggestionRuns.id],
	}),
}));
