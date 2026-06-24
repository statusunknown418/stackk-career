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

		const idempotencyKey = await idempotencyKeys.create(`linkedin-job-${jobTargetId}`);
		const handle = await tasks.trigger<typeof linkedinJobFetchTask>(
			"linkedin-job-fetch",
			{ userId, resumeId, jobTargetId, sourceUrl },
			{
				concurrencyKey: userId,
				idempotencyKey,
				idempotencyKeyTTL: "24h",
				tags: [`user:${userId}`, `resume:${resumeId}`, "agent:linkedin-job-fetch"],
			}
		);

		return { id: jobTargetId, runId: handle.id, publicAccessToken: handle.publicAccessToken };
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
