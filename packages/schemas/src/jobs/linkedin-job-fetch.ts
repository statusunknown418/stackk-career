import { z } from "zod";

/**
 * Canonical, provider-agnostic shape of a fetched job posting. Persisted (as the
 * `structured` payload of `resume_job_targets`) and fed into the resume-analysis
 * prompts so suggestions are tailored to the role the user is applying for.
 *
 * `.describe()` on every field is forwarded to the normalizer model via JSON
 * Schema and acts as a strong field-level instruction — far more reliable than
 * prose. Mirrors the parser-schema convention used across this package.
 */
export const jobPostingSchema = z.object({
	title: z
		.string()
		.nullable()
		.describe(
			"The job title in the posting's original language, faithful to the posting (do not translate or embellish), or null if not present."
		),
	company: z.string().nullable().describe("Hiring company / organization name, or null if not present."),
	location: z
		.string()
		.nullable()
		.describe(
			"Primary location or work mode in the posting's original language (e.g. 'Remote', 'Lima, Perú'), or null."
		),
	employmentType: z
		.string()
		.nullable()
		.describe("Employment type in the posting's original language if stated (e.g. 'Full-time', 'Contract'), or null."),
	seniority: z
		.string()
		.nullable()
		.describe("Seniority level in the posting's original language if stated (e.g. 'Senior', 'Entry level'), or null."),
	summary: z.string().nullable().describe("One or two sentence neutral summary of the role, grounded in the posting."),
	responsibilities: z
		.array(z.string())
		.describe("Key responsibilities / day-to-day duties, each a short phrase. Empty array if none stated."),
	qualifications: z
		.array(z.string())
		.describe("Required and preferred qualifications / requirements, each a short phrase. Empty array if none."),
	skills: z
		.array(z.string())
		.describe("Concrete hard + soft skills, tools, and technologies the posting asks for. Empty array if none."),
	keywords: z
		.array(z.string())
		.describe(
			"ATS keywords a strong applicant's resume should contain to match this posting. Deduplicated, lowercase nouns/noun-phrases. Empty array if none."
		),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;

/** Trigger.dev task input — one background fetch per `resume_job_targets` row. */
export const linkedinJobFetchInputSchema = z.object({
	userId: z.string(),
	resumeId: z.string(),
	jobTargetId: z.string(),
	sourceUrl: z.url(),
});

export type LinkedinJobFetchInput = z.infer<typeof linkedinJobFetchInputSchema>;

/** Task metadata vocabulary — mirrors the lifecycle so observability stays legible. */
export const linkedinJobFetchStepSchema = z.enum(["queued", "fetching", "normalizing", "persisting", "complete"]);
export type LinkedinJobFetchStep = z.infer<typeof linkedinJobFetchStepSchema>;
