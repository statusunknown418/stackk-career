import type { JobPosting } from "./linkedin-job-fetch";

/**
 * Denormalized job-target facts plus the parsed posting. Mirrors the columns on
 * `resume_job_targets` (title/company/location/employmentType/seniority) and
 * carries the normalized {@link JobPosting} when it parsed. `posting` is null
 * when the row's `structured` payload failed validation — the formatter then
 * renders only the denormalized meta lines.
 */
export interface JobTargetContext {
	company: string | null;
	employmentType: string | null;
	location: string | null;
	posting: JobPosting | null;
	seniority: string | null;
	title: string | null;
}

export interface FormatJobTargetContextOptions {
	/**
	 * Render the employment-type meta line. Defaults to true; resume analysis
	 * opts out to keep its historical prompt text byte-for-byte stable.
	 */
	includeEmploymentType?: boolean;
	/**
	 * Framing line prepended above the rendered job data. Omit for a bare data
	 * block (cover-letter `jobDescription`); pass an instruction when the prompt
	 * needs to tell the model how to use the context (resume analysis).
	 */
	intro?: string;
	/**
	 * Hard cap on the rendered `contextText`. Callers writing into the
	 * 5000-character `jobDescription` contracts (`createCoverLetterGenerationInputSchema`,
	 * `caseyLettersInputSchema`) MUST pass `maxChars: 5000`. Omitted = no truncation.
	 */
	maxChars?: number;
}

export interface FormattedJobTargetContext {
	/** Deterministic prompt-ready job context. "" when no usable data is present. */
	contextText: string;
	/** "Title @ Company", falling back to whichever single value exists, or "" when neither does. */
	roleLabel: string;
}

/** Skills / ATS keywords read as comma lists; responsibilities / qualifications as clause lists. */
const INLINE_LIST_SEPARATOR = ", ";
const CLAUSE_LIST_SEPARATOR = "; ";

/**
 * Render normalized job-target data into a compact, deterministic block usable
 * both as prompt context and as persisted job-description text. The single
 * source of truth for turning a {@link JobTargetContext} into prompt text,
 * shared by resume analysis and cover-letter creation so the two stay in sync.
 */
export function formatJobTargetContext(
	target: JobTargetContext,
	options: FormatJobTargetContextOptions = {}
): FormattedJobTargetContext {
	const { intro, includeEmploymentType = true, maxChars } = options;
	// "Title @ Company", or whichever single value exists, or "" when neither does.
	const roleLabel = [target.title, target.company].filter(Boolean).join(" @ ");

	const body: string[] = [];
	if (roleLabel) {
		body.push(`Role: ${roleLabel}`);
	}
	if (target.seniority) {
		body.push(`Seniority: ${target.seniority}`);
	}
	if (target.location) {
		body.push(`Location: ${target.location}`);
	}
	if (includeEmploymentType && target.employmentType) {
		body.push(`Employment type: ${target.employmentType}`);
	}

	const posting = target.posting;
	if (posting?.summary) {
		body.push(`Summary: ${posting.summary}`);
	}
	if (posting && posting.responsibilities.length > 0) {
		body.push(`Responsibilities: ${posting.responsibilities.join(CLAUSE_LIST_SEPARATOR)}`);
	}
	if (posting && posting.qualifications.length > 0) {
		body.push(`Qualifications: ${posting.qualifications.join(CLAUSE_LIST_SEPARATOR)}`);
	}
	if (posting && posting.skills.length > 0) {
		body.push(`Skills sought: ${posting.skills.join(INLINE_LIST_SEPARATOR)}`);
	}
	if (posting && posting.keywords.length > 0) {
		body.push(`ATS keywords: ${posting.keywords.join(INLINE_LIST_SEPARATOR)}`);
	}

	// No usable job data — return empty so callers omit the block or fall back.
	if (body.length === 0) {
		return { roleLabel, contextText: "" };
	}

	const text = (intro ? [intro, ...body] : body).join("\n");
	const contextText = maxChars !== undefined && text.length > maxChars ? text.slice(0, maxChars).trimEnd() : text;

	return { roleLabel, contextText };
}
