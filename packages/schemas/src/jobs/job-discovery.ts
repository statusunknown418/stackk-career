import { z } from "zod";
import { jobSuggestionCadenceEnum } from "../subscriptions/types";

/**
 * Enabled job sources for the suggested-jobs feed. Adding a provider is one
 * entry here plus a registry adapter in the jobs package — everything
 * downstream (dedup, persistence, UI) is source-neutral and keys off `source` +
 * `sourceJobId`.
 */
export const jobSourceEnum = ["linkedin"] as const;
export const jobSourceSchema = z.enum(jobSourceEnum);
export type JobSourceId = z.infer<typeof jobSourceSchema>;

/**
 * One resume skill fed to a provider's native match scorer (e.g. the LinkedIn
 * actor's `resumeKeywords`). `aliases` catch abbreviations / alternate names so
 * "JS" still matches "JavaScript" without matching "JSON".
 */
export const resumeKeywordSchema = z.object({
	keyword: z.string().describe("A skill or keyword from the user's resume."),
	aliases: z.array(z.string()).default([]).describe("Abbreviations or alternate names for the keyword."),
});
export type ResumeKeyword = z.infer<typeof resumeKeywordSchema>;

/**
 * Provider-neutral seniority ladder. `buildJobQuery` derives it from the user's
 * controlled onboarding answers; each source adapter maps it onto that provider's
 * own vocabulary (e.g. LinkedIn's `experienceLevel`). Deliberately coarse - the
 * onboarding funnel only distinguishes these bands.
 */
export const jobSeniorityEnum = ["intern", "junior", "mid", "senior", "lead"] as const;
export const jobSenioritySchema = z.enum(jobSeniorityEnum);
export type JobSeniority = z.infer<typeof jobSenioritySchema>;

/**
 * Derived search parameters handed to a {@link JobSourceId} provider. Built
 * deterministically (no LLM) from the user's `onboarding_profile` + primary
 * resume signal by `buildJobQuery`; the provider adapter maps these onto its
 * native actor input.
 */
export const jobQuerySchema = z.object({
	keywords: z.array(z.string()).describe("Role/skill search terms, most specific first."),
	location: z.string().nullable().describe("Target location or city, or null for anywhere."),
	remote: z.boolean().nullable().describe("Prefer remote roles when true; null = no preference."),
	seniority: jobSenioritySchema
		.nullable()
		.describe("Provider-neutral target seniority band, or null when onboarding gave no level signal."),
	languages: z.array(z.string()).default([]).describe("Posting languages the user can apply in."),
	postedWithinDays: z
		.number()
		.int()
		.positive()
		.describe("Freshness window in days, derived from the user's cadence (daily => 7, monthly => 30)."),
	resumeKeywords: z
		.array(resumeKeywordSchema)
		.default([])
		.describe("Resume skills fed to the provider's native match scorer for a free per-listing fit score."),
});
export type JobQuery = z.infer<typeof jobQuerySchema>;

/**
 * Provider-agnostic normalized shape of a single fetched listing. Lighter
 * sibling of {@link JobPosting} (job-target-context) tuned for a discovery feed:
 * enough to rank + render a card and deep-link out. Persisted as the
 * `structured` payload of `suggested_jobs`.
 */
export const jobListingSchema = z.object({
	sourceJobId: z.string().describe("Stable provider-native id for this posting; the dedup key."),
	url: z.url().describe("Canonical apply/view URL for the posting."),
	title: z.string().nullable().describe("Job title in the posting's original language, or null."),
	company: z.string().nullable().describe("Hiring company / organization name, or null."),
	location: z.string().nullable().describe("Location or work mode in the posting's original language, or null."),
	employmentType: z.string().nullable().describe("Employment type if stated (e.g. 'Full-time'), or null."),
	seniority: z.string().nullable().describe("Seniority level if stated (e.g. 'Senior'), or null."),
	postedAt: z.string().nullable().describe("ISO-8601 date the posting was published, or null."),
	summary: z.string().nullable().describe("One or two sentence neutral summary grounded in the posting."),
	skills: z.array(z.string()).default([]).describe("Concrete hard + soft skills/tools the posting asks for."),
	keywords: z.array(z.string()).default([]).describe("ATS keywords a strong applicant's resume should contain."),
});
export type JobListing = z.infer<typeof jobListingSchema>;

/**
 * One ranker verdict per listing. The LLM ranking pass returns a fit score plus
 * short Spanish reasons (shown on the card); `sourceJobId` MUST reference one of
 * the listings the model was given.
 */
export const rankedJobSchema = z.object({
	sourceJobId: z.string().describe("Must match a sourceJobId from the provided listings."),
	matchScore: z
		.number()
		.int()
		.min(0)
		.max(100)
		.describe("0-100 fit score for this user (100 = ideal match), grounded in profile + listing."),
	reasons: z
		.array(z.string())
		.describe("Short phrases in Spanish explaining the fit (e.g. 'Coincide con tu rol objetivo'). Empty if weak."),
});
export type RankedJob = z.infer<typeof rankedJobSchema>;

/** Trigger.dev task input — one background compute run per user per cadence cycle. */
export const computeSuggestedJobsInputSchema = z.object({
	userId: z.string(),
	runId: z.string(),
	cadence: z.enum(jobSuggestionCadenceEnum),
});
export type ComputeSuggestedJobsInput = z.infer<typeof computeSuggestedJobsInputSchema>;

/** Task metadata vocabulary — mirrors the run lifecycle so observability stays legible. */
export const suggestedJobsStepSchema = z.enum([
	"loading",
	"fetching",
	"normalizing",
	"ranking",
	"persisting",
	"complete",
]);
export type SuggestedJobsStep = z.infer<typeof suggestedJobsStepSchema>;

/**
 * Drizzle cache tag for a user's suggested-jobs feed reads (`suggestedJobs.list`). Single
 * source of truth for the API read (`.$withCache({ tag })`) and the invalidations issued by
 * the compute task and the dismiss / refresh mutations — same discipline as `viewerUsageTag`.
 */
export function suggestedJobsTag(userId: string): string {
	return `viewer:suggested-jobs:${userId}`;
}
