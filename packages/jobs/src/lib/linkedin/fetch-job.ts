/**
 * LinkedIn job-detail provider adapter.
 *
 * Default provider: Apify's single-job-detail actor (`apimaestro~linkedin-job-detail`),
 * invoked through the synchronous `run-sync-get-dataset-items` endpoint which triggers the
 * actor, waits for it to finish (hard 300s cap), and returns the dataset items inline.
 *
 * The actor id and token come from env so swapping to another provider (Bright Data, etc.)
 * only means rewriting this file — the task/normalizer/UI never reference Apify directly.
 * The returned item is intentionally typed loose: output shape differs per actor, so the
 * raw record is handed to the LLM normalizer rather than parsed against fixed field paths.
 */

import { parseLinkedinJobId } from "@stackk-career/schemas/api/resumes";

const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_ACTOR = "apimaestro~linkedin-job-detail";

export type LinkedinJobRaw = Record<string, unknown>;

/** Thrown for non-retryable misconfiguration (e.g. missing token) vs transient provider errors. */
export class LinkedinJobConfigError extends Error {}
export class LinkedinJobFetchError extends Error {}

/**
 * Fetch a SINGLE LinkedIn job posting by URL. Returns the first dataset item as a raw record.
 * @throws {LinkedinJobConfigError} when the provider token is absent (do not retry).
 * @throws {LinkedinJobFetchError} on provider/network failure or an empty result (retryable).
 */
export async function fetchLinkedinJob(sourceUrl: string, signal?: AbortSignal): Promise<LinkedinJobRaw> {
	const token = process.env.APIFY_TOKEN;
	if (!token) {
		throw new LinkedinJobConfigError("APIFY_TOKEN is not configured");
	}

	// The actor's ONLY input is `job_id` (the numeric LinkedIn job id). Any other key is
	// silently ignored and the actor falls back to its default sample job — which is why
	// every fetch returned the same posting. The URL is validated upstream, so a missing
	// id here means a malformed URL slipped through: non-retryable.
	const jobId = parseLinkedinJobId(sourceUrl);
	if (!jobId) {
		throw new LinkedinJobConfigError(`Could not extract a LinkedIn job id from URL: ${sourceUrl}`);
	}

	const actor = process.env.APIFY_LINKEDIN_JOB_ACTOR || DEFAULT_ACTOR;
	const endpoint = `${APIFY_BASE_URL}/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			// Single job by id — the actor returns exactly one dataset item.
			body: JSON.stringify({ job_id: [jobId] }),
			signal,
		});
	} catch (cause) {
		throw new LinkedinJobFetchError(`Apify request failed: ${cause instanceof Error ? cause.message : String(cause)}`);
	}

	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new LinkedinJobFetchError(`Apify responded ${response.status}: ${detail.slice(0, 500)}`);
	}

	const items = (await response.json().catch(() => null)) as unknown;
	if (!Array.isArray(items) || items.length === 0) {
		throw new LinkedinJobFetchError("Apify returned no job items for the provided URL");
	}

	const [first] = items;
	if (!first || typeof first !== "object") {
		throw new LinkedinJobFetchError("Apify returned an unexpected item shape");
	}

	return first as LinkedinJobRaw;
}
