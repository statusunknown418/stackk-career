import type { JobSourceId } from "@stackk-career/schemas/jobs/job-discovery";
import { linkedinJobSource } from "./linkedin-apify";
import type { JobSource } from "./types";

/**
 * Ordered list of sources the suggested-jobs dispatcher fans out over. Adding a
 * provider (Indeed, Computrabajo, …) is one adapter + one entry here; the task
 * iterates this list and never names a concrete source.
 */
export const enabledSources: readonly JobSource[] = [linkedinJobSource];

const sourcesById = Object.fromEntries(enabledSources.map((source) => [source.id, source])) as Record<
	JobSourceId,
	JobSource
>;

/** Resolve a source by id. Throws for an unknown/disabled id (programmer error). */
export function getJobSource(id: JobSourceId): JobSource {
	const source = sourcesById[id];
	if (!source) {
		throw new Error(`Unknown job source: ${id}`);
	}
	return source;
}
