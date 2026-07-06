import { type JobListing, type RankedJob, rankedJobSchema } from "@stackk-career/schemas/jobs/job-discovery";
import { type LanguageModel, Output, streamText } from "ai";
import { withTimeout } from "../lib/user-metadata";

export const JOB_SUGGESTION_RANKER_MODEL: LanguageModel = "google/gemini-3.1-flash-lite";
export const JOB_SUGGESTION_RANKER_OBJECT_TYPE = "job-suggestion-ranker";

const RANKER_TIMEOUT_MS = Number(process.env.JOB_SUGGESTION_RANKER_TIMEOUT_MS ?? 60 * 1000);
/** Hard cap on listings sent in one pass, so the model is never flooded regardless of the caller. */
const MAX_RANK_LISTINGS = Number(process.env.JOB_SUGGESTION_RANKER_MAX_LISTINGS ?? 50);
/** Char budget for the serialized listings array; overflow drops whole listings — it never slices JSON. */
const LISTINGS_JSON_CHAR_BUDGET = Number(process.env.JOB_SUGGESTION_RANKER_JSON_BUDGET ?? 24_000);
/** Per-listing field bounds so one verbose posting can't dominate (or blow up) the payload. */
const SUMMARY_CHAR_LIMIT = 300;
const TAGS_LIMIT = 12;

const SYSTEM_PROMPT = `
You rank scraped job listings by how well each fits ONE specific job seeker. The product UI is Spanish, so "reasons" are written in Spanish — but do NOT prefer Spanish-language jobs; judge fit on the merits below.

You receive:
- The candidate: their target roles / search keywords, seniority hint, work-mode or location preference, the languages they can apply in, whether they speak English ("speaksEnglish"), and the concrete skills on their resume.
- A list of job listings, each with an id, title, company, location, seniority, employment type, a short summary, and required skills / ATS keywords.

For EVERY listing, output exactly one object:
- sourceJobId: copy the listing's "id" VERBATIM. Never invent, reformat, or merge ids.
- matchScore: an INTEGER 0-100 (100 = ideal fit for THIS candidate). Weigh, in rough priority: role/title alignment with the candidate's target, seniority fit, skill overlap (resume skills vs the listing's skills/keywords), then work-mode/location fit. A strong role + skill match at the right seniority scores high; an off-role or wrong-seniority listing scores low even when a few keywords overlap.
- reasons: 1-3 SHORT phrases in SPANISH explaining the fit (e.g. "Coincide con tu rol objetivo de Frontend", "Pide React y TypeScript, presentes en tu CV"). Use an empty array when the fit is weak. Ground every reason strictly in the supplied data — never invent a requirement, skill, company, or seniority.

Posting language:
- Do NOT reward or penalize a listing for the language it is written in. An English-language listing is fully valid when "speaksEnglish" is true.
- Treat language as a NEGATIVE only when the posting plainly requires a language the candidate does not speak — e.g. an English-language role, or one demanding English fluency, while "speaksEnglish" is false. Then lower the score and note the gap in Spanish.

Hard rules:
- Output EXACTLY one object per provided listing — no more, no fewer.
- Do NOT translate the listing content; only the "reasons" are written in Spanish.
- Output ONLY the JSON array conforming to the provided schema. No prose, no markdown fences.
`.trim();

/** Compact candidate profile the ranker scores listings against. Built by the task from the JobQuery + primary resume. */
export interface RankSuggestedJobsCandidate {
	keywords: string[];
	languages: string[];
	location: string | null;
	seniority: string | null;
	skills: string[];
	/** Whether English-language postings are viable for this candidate (see `userSpeaksEnglish`). */
	speaksEnglish: boolean;
}

export interface RankSuggestedJobsInput {
	candidate: RankSuggestedJobsCandidate;
	listings: JobListing[];
	signal?: AbortSignal;
	userId: string;
}

/** The bounded projection of a listing sent to the model — one verbose posting can't dominate the payload. */
interface CompactListing {
	company: string | null;
	employmentType: string | null;
	id: string;
	keywords: string[];
	location: string | null;
	seniority: string | null;
	skills: string[];
	summary: string | null;
	title: string | null;
}

function truncate(value: string | null, limit: number): string | null {
	if (!value || value.length <= limit) {
		return value;
	}
	return `${value.slice(0, limit).trimEnd()}…`;
}

function compactListing(listing: JobListing): CompactListing {
	return {
		id: listing.sourceJobId,
		title: listing.title,
		company: listing.company,
		location: listing.location,
		seniority: listing.seniority,
		employmentType: listing.employmentType,
		summary: truncate(listing.summary, SUMMARY_CHAR_LIMIT),
		skills: listing.skills.slice(0, TAGS_LIMIT),
		keywords: listing.keywords.slice(0, TAGS_LIMIT),
	};
}

/**
 * Serialize the highest-ranked listings that fit the char budget. Listings arrive
 * pre-sorted (best first), so we fill from the front and stop before the budget is
 * exceeded — dropping whole (lowest-ranked) listings rather than slicing the JSON
 * mid-object, so the payload is always valid. Always keeps at least the top listing.
 */
function buildListingsPayload(listings: JobListing[]): CompactListing[] {
	const included: CompactListing[] = [];
	let size = 2; // the enclosing "[]"
	for (const listing of listings.slice(0, MAX_RANK_LISTINGS)) {
		const compact = compactListing(listing);
		const encodedLength = JSON.stringify(compact).length + (included.length > 0 ? 1 : 0); // + comma separator
		if (included.length > 0 && size + encodedLength > LISTINGS_JSON_CHAR_BUDGET) {
			break;
		}
		included.push(compact);
		size += encodedLength;
	}
	return included;
}

/**
 * Optional LLM refinement pass over the already-shortlisted (top-N) listings: returns
 * a refined 0-100 `matchScore` plus short Spanish `reasons` per listing, grounded in
 * the candidate profile + listing. The caller gates this behind `SUGGESTED_JOBS_SKIP_LLM`
 * and falls back to the provider's native score when skipped (and for any listing the
 * model doesn't return). Returns `[]` for no listings.
 */
export async function rankSuggestedJobs({
	candidate,
	listings,
	signal,
	userId,
}: RankSuggestedJobsInput): Promise<RankedJob[]> {
	if (listings.length === 0) {
		return [];
	}

	const listingsJson = JSON.stringify(buildListingsPayload(listings));
	const candidateJson = JSON.stringify(candidate);

	const result = streamText({
		model: JOB_SUGGESTION_RANKER_MODEL,
		output: Output.array({ element: rankedJobSchema }),
		abortSignal: withTimeout(signal, RANKER_TIMEOUT_MS),
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: `Candidate profile JSON:\n${candidateJson}` },
					{ type: "text", text: `Job listings JSON:\n${listingsJson}` },
				],
			},
		],
		providerOptions: {
			gateway: {
				user: userId,
				tags: ["feature:job-suggestion-ranker", `env:${process.env.NODE_ENV ?? "development"}`],
			},
			google: {
				thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
			},
		},
	});

	return await result.output;
}
