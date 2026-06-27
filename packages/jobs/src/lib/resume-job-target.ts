import { getTriggerDb } from "@stackk-career/db/http";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
import { formatJobTargetContext } from "@stackk-career/schemas/jobs/job-target-context";
import { type JobPosting, jobPostingSchema } from "@stackk-career/schemas/jobs/linkedin-job-fetch";
import { and, eq } from "drizzle-orm";

export interface ResumeJobTargetContext {
	company: string | null;
	employmentType: string | null;
	location: string | null;
	posting: JobPosting | null;
	seniority: string | null;
	title: string | null;
}

/**
 * Load the resume's READY target job posting (fetched in the background from a LinkedIn URL).
 * Returns null when there is no target, it is still fetching, or it failed — callers then
 * fall back to base, resume-only suggestions.
 */
export async function getResumeJobTarget(resumeId: string, userId: string): Promise<ResumeJobTargetContext | null> {
	const db = getTriggerDb();

	const [row] = await db
		.select({
			status: resumeJobTargets.status,
			title: resumeJobTargets.title,
			company: resumeJobTargets.company,
			location: resumeJobTargets.location,
			employmentType: resumeJobTargets.employmentType,
			seniority: resumeJobTargets.seniority,
			structured: resumeJobTargets.structured,
		})
		.from(resumeJobTargets)
		.where(and(eq(resumeJobTargets.resumeId, resumeId), eq(resumeJobTargets.userId, userId)))
		.limit(1)
		.$withCache();

	if (!row || row.status !== "ready") {
		return null;
	}

	const parsed = jobPostingSchema.safeParse(row.structured);

	return {
		company: row.company,
		employmentType: row.employmentType,
		location: row.location,
		posting: parsed.success ? parsed.data : null,
		seniority: row.seniority,
		title: row.title,
	};
}

/** Framing line for the resume-analysis "Target job" block. Kept verbatim so prompt output is stable. */
const RESUME_ANALYSIS_JOB_TARGET_INTRO =
	"Target job the user is applying for. Tailor suggestions to maximize fit with THIS role and surface gaps versus it. Never invent experience the resume does not support.";

/**
 * Render a compact, high-signal "Target job" block for the resume-analysis prompts so the
 * model tailors keyword/impact suggestions to the role the user is applying for. Returns null
 * when there is no usable job context (the prompt then omits the block entirely).
 *
 * Delegates rendering to the shared {@link formatJobTargetContext}; employment type is omitted
 * to keep this prompt's historical text unchanged.
 */
export function buildJobTargetContextText(jobTarget: ResumeJobTargetContext | null): string | null {
	if (!jobTarget) {
		return null;
	}

	const { contextText } = formatJobTargetContext(jobTarget, {
		intro: RESUME_ANALYSIS_JOB_TARGET_INTRO,
		includeEmploymentType: false,
	});

	return contextText === "" ? null : contextText;
}
