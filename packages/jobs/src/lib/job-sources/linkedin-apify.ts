/**
 * LinkedIn job-search provider adapter — Apify's `cheap_scraper/linkedin-job-scraper`
 * (keyword-search mode), invoked through the synchronous `run-sync-get-dataset-items`
 * endpoint (triggers the actor, waits, returns the dataset inline).
 *
 * The actor id + token come from env so swapping providers only touches this file;
 * nothing downstream references Apify. `buildActorInput` / `mapLinkedinItem` are pure
 * and unit-tested against a fixture so the mapping is verifiable without live spend.
 *
 * Cost note: under pay-per-result the actor requires `maxItems >= 150`. We fetch that
 * floor for selection quality and let the task surface only the top-ranked subset.
 */

import type { JobQuery, JobSeniority } from "@stackk-career/schemas/jobs/job-discovery";
import { jobListingSchema } from "@stackk-career/schemas/jobs/job-discovery";
import type { JobSource, RawJobListing, SourcedListing } from "./types";
import { JobSourceConfigError, JobSourceFetchError } from "./types";

const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_ACTOR = "cheap_scraper~linkedin-job-scraper";
/** Apify pay-per-result billing floor; we fetch this many and surface only the best. */
const APIFY_MAX_ITEMS = 150;
const SUMMARY_CHAR_LIMIT = 400;
const PROVIDER_ERROR_DETAIL_LIMIT = 500;

/** Actor `publishedAt` buckets (relative seconds); the actor accepts only these. */
const PUBLISHED_LAST_DAY = "r86400";
const PUBLISHED_LAST_WEEK = "r604800";
const PUBLISHED_LAST_MONTH = "r2592000";

function asString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function truncateSummary(value: unknown): string | null {
	const text = asString(value);
	if (!text) {
		return null;
	}
	return text.length <= SUMMARY_CHAR_LIMIT ? text : `${text.slice(0, SUMMARY_CHAR_LIMIT).trimEnd()}…`;
}

/** Map a freshness window (days) onto the actor's coarse `publishedAt` buckets. */
function mapPublishedAt(postedWithinDays: number): string {
	if (postedWithinDays <= 1) {
		return PUBLISHED_LAST_DAY;
	}
	if (postedWithinDays <= 7) {
		return PUBLISHED_LAST_WEEK;
	}
	return PUBLISHED_LAST_MONTH;
}

/** Remote preference -> actor `workType`; omitted (broadest) when there's no preference. */
function mapWorkType(remote: boolean | null): string[] | undefined {
	if (remote === true) {
		return ["remote"];
	}
	if (remote === false) {
		return ["on-site"];
	}
	return;
}

/** Provider-neutral seniority band -> LinkedIn actor `experienceLevel` values (exhaustive). */
const EXPERIENCE_LEVEL: Record<JobSeniority, string[]> = {
	intern: ["internship", "entry-level"],
	junior: ["entry-level"],
	mid: ["associate", "mid-senior"],
	senior: ["mid-senior"],
	lead: ["director"],
};

/** Map a {@link JobQuery} onto the actor's keyword-search input payload. */
export function buildActorInput(query: JobQuery): Record<string, unknown> {
	const input: Record<string, unknown> = {
		keyword: query.keywords,
		publishedAt: mapPublishedAt(query.postedWithinDays),
		maxItems: APIFY_MAX_ITEMS,
		saveOnlyUniqueItems: true,
		enrichCompanyData: false,
	};

	if (query.location) {
		input.locations = [query.location];
	}

	const workType = mapWorkType(query.remote);
	if (workType) {
		input.workType = workType;
	}

	if (query.seniority) {
		input.experienceLevel = EXPERIENCE_LEVEL[query.seniority];
	}

	if (query.resumeKeywords.length > 0) {
		input.resumeKeywords = query.resumeKeywords;
	}

	return input;
}

/**
 * Map one raw actor item onto a {@link SourcedListing}. Returns `null` for items
 * missing the dedup key (`jobId`) or a usable URL, or that otherwise fail the
 * canonical schema — those are skipped rather than failing the whole run.
 */
export function mapLinkedinItem(raw: RawJobListing): SourcedListing | null {
	const sourceJobId = asString(raw.jobId);
	const url = asString(raw.jobUrl) ?? asString(raw.applyUrl);
	if (!(sourceJobId && url)) {
		return null;
	}

	const parsed = jobListingSchema.safeParse({
		sourceJobId,
		url,
		title: asString(raw.jobTitle),
		company: asString(raw.companyName),
		location: asString(raw.location),
		employmentType: asString(raw.contractType),
		seniority: asString(raw.experienceLevel),
		postedAt: asString(raw.publishedAt),
		summary: truncateSummary(raw.jobDescription),
		skills: asStringArray(raw.matchedKeywords),
		keywords: asStringArray(raw.unmatchedKeywords),
	});
	if (!parsed.success) {
		return null;
	}

	return {
		listing: parsed.data,
		nativeScore: asNumber(raw.keywordMatchScorePercentage),
		// Absent field => no dynamic filters configured => treat as a pass.
		dynamicFilterMatch: raw.dynamicFilterMatch !== false,
	};
}

async function search(query: JobQuery, signal?: AbortSignal): Promise<SourcedListing[]> {
	const token = process.env.APIFY_TOKEN;
	if (!token) {
		throw new JobSourceConfigError("APIFY_TOKEN is not configured");
	}

	const actor = process.env.APIFY_LINKEDIN_JOB_SEARCH_ACTOR || DEFAULT_ACTOR;
	const endpoint = `${APIFY_BASE_URL}/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(buildActorInput(query)),
			signal,
		});
	} catch (cause) {
		throw new JobSourceFetchError(`Apify request failed: ${cause instanceof Error ? cause.message : String(cause)}`);
	}

	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new JobSourceFetchError(
			`Apify responded ${response.status}: ${detail.slice(0, PROVIDER_ERROR_DETAIL_LIMIT)}`
		);
	}

	const items = (await response.json().catch(() => null)) as unknown;
	if (!Array.isArray(items)) {
		throw new JobSourceFetchError("Apify returned a non-array dataset");
	}

	const listings: SourcedListing[] = [];
	for (const item of items) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const mapped = mapLinkedinItem(item as RawJobListing);
		if (mapped) {
			listings.push(mapped);
		}
	}
	return listings;
}

/** LinkedIn source backed by the `cheap_scraper/linkedin-job-scraper` Apify actor. */
export const linkedinJobSource: JobSource = {
	id: "linkedin",
	search,
};
