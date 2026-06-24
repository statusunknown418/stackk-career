import { getTriggerDb } from "@stackk-career/db/http";
import { resumeJobTargets } from "@stackk-career/db/schema/resume-job-targets";
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

/**
 * Render a compact, high-signal "Target job" block for the resume-analysis prompts so the
 * model tailors keyword/impact suggestions to the role the user is applying for. Returns null
 * when there is no usable job context (the prompt then omits the block entirely).
 */
export function buildJobTargetContextText(jobTarget: ResumeJobTargetContext | null): string | null {
	if (!jobTarget) {
		return null;
	}

	const lines: string[] = [
		"Target job the user is applying for. Tailor suggestions to maximize fit with THIS role and surface gaps versus it. Never invent experience the resume does not support.",
	];

	const heading = [jobTarget.title, jobTarget.company].filter(Boolean).join(" @ ");
	if (heading) {
		lines.push(`Role: ${heading}`);
	}
	if (jobTarget.seniority) {
		lines.push(`Seniority: ${jobTarget.seniority}`);
	}
	if (jobTarget.location) {
		lines.push(`Location: ${jobTarget.location}`);
	}

	const posting = jobTarget.posting;
	if (posting?.summary) {
		lines.push(`Summary: ${posting.summary}`);
	}
	if (posting && posting.responsibilities.length > 0) {
		lines.push(`Responsibilities: ${posting.responsibilities.join("; ")}`);
	}
	if (posting && posting.qualifications.length > 0) {
		lines.push(`Qualifications: ${posting.qualifications.join("; ")}`);
	}
	if (posting && posting.skills.length > 0) {
		lines.push(`Skills sought: ${posting.skills.join(", ")}`);
	}
	if (posting && posting.keywords.length > 0) {
		lines.push(`ATS keywords: ${posting.keywords.join(", ")}`);
	}

	// Only the instruction line means no job content was usable — skip the block entirely.
	return lines.length > 1 ? lines.join("\n") : null;
}
