import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { resumes } from "./resumes";

/**
 * Lifecycle of a background LinkedIn job fetch:
 * `pending` (row created, task queued) → `fetching` (provider call in flight) →
 * `ready` (job posting normalized + denormalized onto the resume) | `failed`
 * (provider/normalizer error; the resume stays fully usable without job context).
 */
export const resumeJobTargetStatusEnum = ["pending", "fetching", "ready", "failed"] as const;
export type ResumeJobTargetStatus = (typeof resumeJobTargetStatusEnum)[number];

/**
 * One target job posting per resume, fetched from a LinkedIn job URL in the
 * background. `structured` holds the normalized {@link ResumeJobPosting} payload
 * (validated via the zod mirror in `@stackk-career/schemas/jobs/linkedin-job-fetch`)
 * and is the high-signal context fed into the resume-analysis prompts so the AI
 * tailors its suggestions to the role the user is applying for.
 */
export const resumeJobTargets = sqliteTable(
	"resume_job_targets",
	(t) => ({
		id: t
			.text()
			.primaryKey()
			.$defaultFn(() => `rjt_${createId()}`),
		resumeId: t
			.text()
			.notNull()
			.references(() => resumes.id, { onDelete: "cascade" }),
		userId: t
			.text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		sourceUrl: t.text().notNull(),
		provider: t.text().notNull().default("apify"),
		status: t.text({ enum: resumeJobTargetStatusEnum }).notNull().default("pending"),

		title: t.text(),
		company: t.text(),
		location: t.text(),
		employmentType: t.text(),
		seniority: t.text(),
		description: t.text(),
		// Normalized ResumeJobPosting (responsibilities/qualifications/skills/keywords).
		// Untyped JSON column on purpose — validated through the zod schema in the schemas
		// package, mirroring how `resume_analyses.object` is persisted.
		structured: t.text({ mode: "json" }),

		error: t.text(),

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
		uniqueIndex("rjt_resume_idx").on(t.resumeId),
		index("rjt_user_idx").on(t.userId),
		index("rjt_status_idx").on(t.status),
	]
);

export const resumeJobTargetsRelations = relations(resumeJobTargets, ({ one }) => ({
	resume: one(resumes, {
		fields: [resumeJobTargets.resumeId],
		references: [resumes.id],
	}),
	user: one(user, {
		fields: [resumeJobTargets.userId],
		references: [user.id],
	}),
}));
