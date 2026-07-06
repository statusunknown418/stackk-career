import type { JobListing, JobQuery, JobSourceId } from "@stackk-career/schemas/jobs/job-discovery";

/**
 * A listing exactly as a provider actor returns it. Shape differs per source, so
 * it stays loosely typed and is mapped to the canonical {@link JobListing} inside
 * each adapter (same rationale as `LinkedinJobRaw` in `lib/linkedin/fetch-job.ts`).
 */
export type RawJobListing = Record<string, unknown>;

/**
 * A normalized listing plus the provider's cheap, native match signals. Adapters
 * own the raw -> canonical mapping so everything downstream (dedup, ranking,
 * persistence, UI) is fully source-neutral.
 *
 * - `nativeScore` — provider-native 0-100 fit score (LinkedIn actor's
 *   `keywordMatchScorePercentage`), or `null` when the source does not score.
 * - `dynamicFilterMatch` — `false` when the provider fetched the job but it
 *   failed a post-fetch filter; `true` otherwise (and when the source has no
 *   such concept). The ranking step drops the `false` rows.
 */
export interface SourcedListing {
	dynamicFilterMatch: boolean;
	listing: JobListing;
	nativeScore: number | null;
}

/** Non-retryable provider misconfiguration (missing token / actor id). */
export class JobSourceConfigError extends Error {}

/** Transient provider / network failure or an unusable response (retryable). */
export class JobSourceFetchError extends Error {}

/**
 * A pluggable job-listing provider. Adding a source is one adapter implementing
 * this interface plus one line in `registry.ts`; nothing downstream references a
 * concrete provider. `search` returns already-normalized listings and never
 * throws on an empty result (a search legitimately matching nothing yields `[]`).
 */
export interface JobSource {
	readonly id: JobSourceId;
	search(query: JobQuery, signal?: AbortSignal): Promise<SourcedListing[]>;
}
