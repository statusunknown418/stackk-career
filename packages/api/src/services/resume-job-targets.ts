import type { db as dbClient } from "@stackk-career/db";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import type { linkedinJobFetchTask } from "@stackk-career/jobs/trigger/tasks/linkedin-job-fetch";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";
import type { RequestLogger } from "evlog";

export interface ResumeJobTargetHandle {
	id: string;
	publicAccessToken: string;
	runId: string;
}

interface TriggerLinkedinJobFetchOptions {
	db: typeof dbClient;
	idempotencyKey: string | string[];
	jobTargetId: string;
	log?: RequestLogger;
	resumeId: string;
	sourceUrl: string;
	userId: string;
}

/**
 * Trigger the LinkedIn fetch task for an existing `resume_job_targets` row.
 *
 * @description Never throws. On any trigger failure it marks the row `failed` and resolves
 * `undefined`, so callers can treat a missing handle as "fetch did not start".
 * @returns The run handle the client subscribes to, or `undefined` when the trigger failed.
 */
async function triggerLinkedinJobFetch({
	db,
	idempotencyKey,
	jobTargetId,
	log,
	resumeId,
	sourceUrl,
	userId,
}: TriggerLinkedinJobFetchOptions): Promise<ResumeJobTargetHandle | undefined> {
	try {
		const key = await idempotencyKeys.create(idempotencyKey);
		const handle = await tasks.trigger<typeof linkedinJobFetchTask>(
			"linkedin-job-fetch",
			{ userId, resumeId, jobTargetId, sourceUrl },
			{
				concurrencyKey: userId,
				idempotencyKey: key,
				idempotencyKeyTTL: "24h",
				tags: [`user:${userId}`, `resume:${resumeId}`, "agent:linkedin-job-fetch"],
			}
		);

		return { id: jobTargetId, runId: handle.id, publicAccessToken: handle.publicAccessToken };
	} catch {
		log?.set({ jobTargetStatus: "trigger_failed" });
		await db
			.update(resumeJobTargets)
			.set({ status: "failed", error: "trigger_failed" })
			.where(and(eq(resumeJobTargets.id, jobTargetId), eq(resumeJobTargets.userId, userId)));
		return;
	}
}

interface StartResumeJobTargetFetchOptions {
	db: typeof dbClient;
	log?: RequestLogger;
	resumeId: string;
	sourceUrl: string;
	userId: string;
}

/**
 * Best-effort: persist a pending `resume_job_targets` row and trigger the LinkedIn fetch task.
 *
 * @description Never throws. On any failure it marks the row `failed` (when one was created) and
 * resolves `undefined`, so the caller's resume creation — already committed — is never affected.
 * @returns The run handle the client subscribes to, or `undefined` when no fetch was started.
 */
export async function startResumeJobTargetFetch({
	db,
	log,
	resumeId,
	sourceUrl,
	userId,
}: StartResumeJobTargetFetchOptions): Promise<ResumeJobTargetHandle | undefined> {
	let jobTargetId: string | undefined;

	try {
		const [created] = await db
			.insert(resumeJobTargets)
			.values({ resumeId, userId, sourceUrl, status: "pending" })
			.returning({ id: resumeJobTargets.id });

		jobTargetId = created?.id;
		if (!jobTargetId) {
			return;
		}

		return await triggerLinkedinJobFetch({
			db,
			idempotencyKey: `linkedin-job-${jobTargetId}`,
			jobTargetId,
			log,
			resumeId,
			sourceUrl,
			userId,
		});
	} catch {
		log?.set({ jobTargetStatus: "trigger_failed" });
		if (jobTargetId) {
			await db
				.update(resumeJobTargets)
				.set({ status: "failed", error: "trigger_failed" })
				.where(and(eq(resumeJobTargets.id, jobTargetId), eq(resumeJobTargets.userId, userId)));
		}
		return;
	}
}

interface ChangeResumeJobTargetOptions {
	db: typeof dbClient;
	log?: RequestLogger;
	resumeId: string;
	sourceUrl: string;
	userId: string;
}

/**
 * Re-point a resume at a different LinkedIn job posting.
 *
 * @description Upserts the (unique-per-resume) `resume_job_targets` row back to `pending`,
 * clearing the previously fetched posting so the editor card and analysis prompts never blend
 * the old role with the new one, then re-triggers the fetch. Callers MUST verify the resume
 * belongs to the user before invoking. The idempotency key includes the row's fresh `updatedAt`
 * so every explicit change starts a new run — even when the same URL is retried after a failure.
 * @returns The run handle, or `undefined` when the trigger failed (the row is then marked `failed`).
 */
export async function changeResumeJobTarget({
	db,
	log,
	resumeId,
	sourceUrl,
	userId,
}: ChangeResumeJobTargetOptions): Promise<ResumeJobTargetHandle | undefined> {
	const [row] = await db
		.insert(resumeJobTargets)
		.values({ resumeId, userId, sourceUrl, status: "pending" })
		.onConflictDoUpdate({
			target: resumeJobTargets.resumeId,
			set: {
				sourceUrl,
				status: "pending",
				title: null,
				company: null,
				location: null,
				employmentType: null,
				seniority: null,
				description: null,
				structured: null,
				error: null,
				updatedAt: new Date(),
			},
		})
		.returning({ id: resumeJobTargets.id, updatedAt: resumeJobTargets.updatedAt });

	const jobTargetId = row?.id;
	if (!jobTargetId) {
		return;
	}

	return await triggerLinkedinJobFetch({
		db,
		idempotencyKey: ["linkedin-job", jobTargetId, String(row.updatedAt.getTime())],
		jobTargetId,
		log,
		resumeId,
		sourceUrl,
		userId,
	});
}
