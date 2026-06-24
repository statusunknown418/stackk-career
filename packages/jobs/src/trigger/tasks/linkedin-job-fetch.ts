/**
 * LinkedIn job-fetch task.
 *
 * Runs in the background after a resume is created with a target LinkedIn job URL:
 *   fetching (provider scrape) → normalizing (LLM → canonical JobPosting) →
 *   persisting (ready + denormalize title/company onto the resume).
 *
 * Failure is non-fatal to the resume: the `resume_job_targets` row is marked
 * `failed` (via onFailure) and the resume stays fully usable, just without job
 * context in its AI suggestions.
 */
import { getTriggerDb } from "@stackk-career/db/http";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import { resumes } from "@stackk-career/db/schema/resumes";
import { linkedinJobFetchInputSchema } from "@stackk-career/schemas/jobs/linkedin-job-fetch";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import { LINKEDIN_JOB_NORMALIZER_MODEL, runLinkedinJobNormalizer } from "../../agents/linkedin-job-normalizer.handler";
import { fetchLinkedinJob, LinkedinJobConfigError } from "../../lib/linkedin/fetch-job";
import { linkedinJobQueue } from "../queues";

const ERROR_MESSAGE_LIMIT = 500;

export const linkedinJobFetchTask = schemaTask({
	id: "linkedin-job-fetch",
	queue: linkedinJobQueue,
	schema: linkedinJobFetchInputSchema,
	maxDuration: 360,
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 2000,
		maxTimeoutInMs: 30_000,
	},
	run: async ({ userId, resumeId, jobTargetId, sourceUrl }, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("linkedin-job-fetch = start", { userId, resumeId, jobTargetId, attempt: ctx.attempt.number });

		// Missing token can't be fixed by retrying — abort so onFailure records it once.
		if (!process.env.APIFY_TOKEN) {
			throw new AbortTaskRunError("APIFY_TOKEN is not configured; cannot fetch LinkedIn job details");
		}

		const ownerScope = and(eq(resumeJobTargets.id, jobTargetId), eq(resumeJobTargets.userId, userId));

		metadata.set("step", "fetching");
		await db.update(resumeJobTargets).set({ status: "fetching" }).where(ownerScope);

		let raw: Record<string, unknown>;
		try {
			raw = await fetchLinkedinJob(sourceUrl, signal);
		} catch (err) {
			if (err instanceof LinkedinJobConfigError) {
				throw new AbortTaskRunError(err.message);
			}
			throw err;
		}

		metadata.set("step", "normalizing");
		const posting = await runLinkedinJobNormalizer({ raw, signal, sourceUrl, userId });

		metadata.set("step", "persisting");
		await db
			.update(resumeJobTargets)
			.set({
				status: "ready",
				title: posting.title,
				company: posting.company,
				location: posting.location,
				employmentType: posting.employmentType,
				seniority: posting.seniority,
				description: posting.summary,
				structured: posting,
				error: null,
			})
			.where(ownerScope);

		// Denormalize onto the resume so the card subtitle + analyses read it cheaply.
		// Never clobber a target role the user typed explicitly; only fill when empty.
		const [resume] = await db
			.select({ targetRole: resumes.targetRole })
			.from(resumes)
			.where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
			.limit(1);

		const resumePatch: { targetRole?: string; targetedCompanyIdentifier?: string } = {};
		if (posting.company) {
			resumePatch.targetedCompanyIdentifier = posting.company;
		}
		if (posting.title && !resume?.targetRole) {
			resumePatch.targetRole = posting.title;
		}
		if (Object.keys(resumePatch).length > 0) {
			await db
				.update(resumes)
				.set(resumePatch)
				.where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)));
		}

		metadata.set("step", "complete");
		logger.info("linkedin-job-fetch = completed", {
			jobTargetId,
			resumeId,
			model: String(LINKEDIN_JOB_NORMALIZER_MODEL),
			title: posting.title,
			company: posting.company,
		});

		return { jobTargetId, resumeId, status: "ready" as const, title: posting.title, company: posting.company };
	},

	onFailure: async ({ payload, error }) => {
		const db = getTriggerDb();
		const message = toError(error).message.slice(0, ERROR_MESSAGE_LIMIT);

		await db
			.update(resumeJobTargets)
			.set({ status: "failed", error: message })
			.where(and(eq(resumeJobTargets.id, payload.jobTargetId), eq(resumeJobTargets.userId, payload.userId)));

		logger.warn("linkedin-job-fetch = failed", {
			jobTargetId: payload.jobTargetId,
			resumeId: payload.resumeId,
			error: message,
		});
	},
});
