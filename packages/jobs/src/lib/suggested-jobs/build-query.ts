import type { JobQuery, JobSeniority, ResumeKeyword } from "@stackk-career/schemas/jobs/job-discovery";
import type { JobSuggestionCadence } from "@stackk-career/schemas/subscriptions";
import type { CoverLetterContext, OnboardingProfileRow, PrimaryResumeContext } from "./load-context";

export interface BuildJobQueryInput {
	cadence: JobSuggestionCadence;
	letters: CoverLetterContext[];
	profile: OnboardingProfileRow | null;
	resume: PrimaryResumeContext | null;
}

/**
 * Freshness window (days) handed to the provider, derived from the user's refresh
 * cadence: daily plans see the last week, monthly plans the last month. Kept
 * separate from `JOB_SUGGESTION_CADENCE_DAYS` (min days between runs) on purpose —
 * this is "how old a posting may be", not "how often we run".
 */
const CADENCE_FRESHNESS_DAYS: Record<JobSuggestionCadence, number> = { daily: 7, monthly: 30 };
/** LinkedIn keyword search is sharpest with a few focused terms, not a skill dump. */
const MAX_KEYWORDS = 8;
/** Enough resume skills to give the provider's native scorer signal without bloating the payload. */
const MAX_RESUME_KEYWORDS = 40;
/** Assumed default for this LATAM product; onboarding only asks for languages BESIDES Spanish. */
const DEFAULT_LANGUAGE = "Español";
/** Added to the applicable languages when the user speaks English (see {@link userSpeaksEnglish}). */
const DEFAULT_ENGLISH = "Inglés";

const REMOTE_TOKENS = /(remoto|remote)/i;
const ONSITE_TOKENS = /(presencial|oficina|on[-\s]?site|onsite)/i;

/**
 * Controlled onboarding answers -> provider-neutral seniority band. Keyed on the exact
 * option labels the onboarding chat persists: `targetRole` (the level the user is aiming
 * for) and `experience` (the level they already have). A value outside this set yields
 * null, so the provider's seniority filter is simply omitted (broader search).
 */
const ONBOARDING_SENIORITY = new Map<string, JobSeniority>([
	// targetRole — desired level of responsibility
	["Prácticas / Trainee", "intern"],
	["Especialista / Junior", "junior"],
	["Coordinador / Lead", "senior"],
	["Gerente / Director", "lead"],
	// experience — years of professional experience
	["Sin experiencia / Estudiante", "intern"],
	["Junior (1–3 años)", "junior"],
	["Semi-Senior (3–5 años)", "mid"],
	["Senior / Lead (5+ años)", "senior"],
]);

/** Target level preferred over current experience; null when neither is a known band. */
function mapSeniority(targetRole: string | null, experience: string | null): JobSeniority | null {
	return (
		ONBOARDING_SENIORITY.get(targetRole?.trim() ?? "") ?? ONBOARDING_SENIORITY.get(experience?.trim() ?? "") ?? null
	);
}

/** Dedupe case-insensitively, preserve first-seen order, drop empties, cap at `limit`. */
function dedupeOrdered(values: (string | null | undefined)[], limit: number): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of values) {
		const value = raw?.trim();
		if (!value) {
			continue;
		}
		const key = value.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		out.push(value);
		if (out.length >= limit) {
			break;
		}
	}
	return out;
}

/**
 * Onboarding stores a work-MODALITY string in `location` ("Remoto (100% online)",
 * "Híbrido (Mixto)", "Presencial (Oficina)", "Sin preferencia"), not a city. Map it
 * to a remote preference; hybrid / no-preference / unknown => null (broadest search).
 */
function deriveRemote(location: string | null): boolean | null {
	if (!location) {
		return null;
	}
	if (REMOTE_TOKENS.test(location)) {
		return true;
	}
	if (ONSITE_TOKENS.test(location)) {
		return false;
	}
	return null;
}

/**
 * Whether the user can apply to English-language postings. Read from the onboarding
 * `languages` answer, a controlled list ("Solo español", or "Inglés (Nivel), …"). Unanswered
 * or skipped is persisted as null -> DEFAULT TO YES so English roles aren't hidden from users
 * who skipped the question; an explicit "Solo español" (English absent) means no.
 */
export function userSpeaksEnglish(languages: string | null): boolean {
	const trimmed = languages?.trim();
	if (!trimmed) {
		return true;
	}
	return trimmed.includes("Inglés");
}

/** Languages the user can apply in: always Spanish, plus English when they speak it. */
function applicableLanguages(speaksEnglish: boolean): string[] {
	return speaksEnglish ? [DEFAULT_LANGUAGE, DEFAULT_ENGLISH] : [DEFAULT_LANGUAGE];
}

/**
 * Deterministically map a user's onboarding profile + primary resume signal + recent
 * cover letters into a provider-neutral {@link JobQuery}. No LLM, no I/O — pure so the
 * same inputs always yield the same query (and it's cheap to unit-test).
 *
 * Notes on the onboarding model this reads:
 * - `profile.location` is a work modality, not a city -> feeds `remote`, and `JobQuery.location`
 *   stays null (we never captured a city, and a resume address would be PII we don't send).
 * - `profile.targetRole` / `profile.experience` are seniority hints -> passed as a `seniority`
 *   string that each adapter fuzzy-maps to its own enum.
 */
export function buildJobQuery({ profile, resume, letters, cadence }: BuildJobQueryInput): JobQuery {
	const roleSignals = [
		resume?.targetRole,
		...(resume?.roleTitles ?? []),
		...letters.map((letter) => letter.jobPosition),
	];

	let keywords = dedupeOrdered(roleSignals, MAX_KEYWORDS);
	if (keywords.length === 0) {
		// No role/title signal at all — fall back to concrete skills, then the broad industry term.
		keywords = dedupeOrdered([...(resume?.skills ?? []), profile?.industry], MAX_KEYWORDS);
	}

	const resumeKeywords: ResumeKeyword[] = dedupeOrdered(resume?.skills ?? [], MAX_RESUME_KEYWORDS).map((keyword) => ({
		keyword,
		aliases: [],
	}));

	const speaksEnglish = userSpeaksEnglish(profile?.languages ?? null);

	return {
		keywords,
		location: null,
		remote: deriveRemote(profile?.location ?? null),
		seniority: mapSeniority(profile?.targetRole ?? null, profile?.experience ?? null),
		languages: applicableLanguages(speaksEnglish),
		postedWithinDays: CADENCE_FRESHNESS_DAYS[cadence],
		resumeKeywords,
	};
}
