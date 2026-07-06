import { getTriggerDb } from "@stackk-career/db/http";
import { generations } from "@stackk-career/db/schema/generations";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { type ResumeAnalysis, resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import { getSectionKind, isExperienceLikeSectionKind, type SectionKind } from "@stackk-career/schemas/api/resumes";
import { type BlockNode, buildBlockTree } from "@stackk-career/schemas/db/resume-blocks";
import { and, desc, eq, isNull } from "drizzle-orm";

/** Onboarding answers, verbatim. `location` holds a work-modality string, not a city (see build-query). */
export type OnboardingProfileRow = typeof onboardingProfile.$inferSelect;
/** One recent cover-letter generation row. */
type GenerationRow = typeof generations.$inferSelect;
/** The user's primary resume row. */
type ResumeRow = typeof resumes.$inferSelect;

/** Recent cover letters — role signals for the search query (never their body / PII). */
export interface CoverLetterContext {
	/** CASEY's short "Role · Company" label (`generations.documentTitle`). */
	documentTitle: GenerationRow["documentTitle"];
	/** Raw job position the user wrote the letter for (`generations.title`). */
	jobPosition: GenerationRow["title"];
	/** Output language of the letter (`generations.language`: `es` | `en`). */
	language: GenerationRow["language"];
}

/**
 * The user's primary resume distilled to the signals the job search needs. The row
 * columns are reused straight from the `resumes` schema; `skills` / `roleTitles` are
 * derived deterministically from the block tree; `analysis` is the latest READY analysis.
 */
export interface PrimaryResumeContext
	extends Pick<ResumeRow, "displayName" | "id" | "targetedCompanyIdentifier" | "targetRole" | "title"> {
	/** Latest READY analysis object, or null when none exists / it failed to parse. */
	analysis: ResumeAnalysis | null;
	/** Entry titles from experience-like sections (experience / projects / volunteering), in resume order. */
	roleTitles: string[];
	/** Concrete skills (skill_item values, or a skill_line label when the line has no items), deduped in resume order. */
	skills: string[];
}

/** Everything `buildJobQuery` + the ranker need for one user, loaded via the HTTP libSQL client. */
export interface SuggestedJobsContext {
	letters: CoverLetterContext[];
	profile: OnboardingProfileRow | null;
	resume: PrimaryResumeContext | null;
}

const RECENT_LETTERS_LIMIT = 5;
/** Bound the derived lists so a huge resume can't blow up the query / prompt. */
const MAX_SKILLS = 60;
const MAX_ROLE_TITLES = 8;

interface ResumeSignals {
	roleTitles: string[];
	skills: string[];
}

const pushTrimmed = (target: string[], value: string): void => {
	const trimmed = value.trim();
	if (trimmed.length > 0) {
		target.push(trimmed);
	}
};

/**
 * Walk the block tree once, collecting concrete skills and experience-like entry
 * titles. `skill_item.value` is the real skill; a `skill_line.label` is a category
 * heading, so it's only used as a fallback when the line has no items.
 */
function collectResumeSignals(nodes: BlockNode[], acc: ResumeSignals, sectionKind: SectionKind | null): void {
	for (const node of nodes) {
		switch (node.blockType) {
			case "section": {
				collectResumeSignals(node.children, acc, getSectionKind(node.content));
				break;
			}
			case "entry": {
				if (sectionKind && isExperienceLikeSectionKind(sectionKind)) {
					pushTrimmed(acc.roleTitles, node.content.title);
				}
				collectResumeSignals(node.children, acc, sectionKind);
				break;
			}
			case "skill_line": {
				const before = acc.skills.length;
				collectResumeSignals(node.children, acc, sectionKind);
				if (acc.skills.length === before) {
					pushTrimmed(acc.skills, node.content.label);
				}
				break;
			}
			case "skill_item": {
				pushTrimmed(acc.skills, node.content.value);
				break;
			}
			default: {
				collectResumeSignals(node.children, acc, sectionKind);
			}
		}
	}
}

/** Dedupe case-insensitively, preserve first-seen order, cap at `limit`. */
function dedupeOrdered(values: string[], limit: number): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
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
 * Load the onboarding profile, primary resume (with derived skills / role titles /
 * latest analysis) and recent cover letters for a user. Pure reads over the HTTP
 * libSQL client so it is safe to import at module scope in a Trigger task.
 */
export async function loadSuggestedJobsContext(userId: string): Promise<SuggestedJobsContext> {
	const db = getTriggerDb();

	const [profileRows, resumeRows, letterRows] = await Promise.all([
		db.select().from(onboardingProfile).where(eq(onboardingProfile.userId, userId)).limit(1),
		db
			.select({
				id: resumes.id,
				displayName: resumes.displayName,
				title: resumes.title,
				targetRole: resumes.targetRole,
				targetedCompanyIdentifier: resumes.targetedCompanyIdentifier,
			})
			.from(resumes)
			.where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)))
			.orderBy(desc(resumes.updatedAt))
			.limit(1),
		db
			.select({
				jobPosition: generations.title,
				documentTitle: generations.documentTitle,
				language: generations.language,
			})
			.from(generations)
			.where(and(eq(generations.owner, userId), eq(generations.type, "cover-letter")))
			.orderBy(desc(generations.createdAt))
			.limit(RECENT_LETTERS_LIMIT),
	]);

	const profile = profileRows.at(0) ?? null;
	const primaryResume = resumeRows.at(0) ?? null;
	const letters: CoverLetterContext[] = letterRows.map((row) => ({
		jobPosition: row.jobPosition,
		documentTitle: row.documentTitle,
		language: row.language,
	}));

	if (!primaryResume) {
		return { profile, resume: null, letters };
	}

	const [blockRows, analysisRows] = await Promise.all([
		db
			.select()
			.from(resumeBlocks)
			.where(and(eq(resumeBlocks.resumeId, primaryResume.id), isNull(resumeBlocks.deletedAt))),
		db
			.select({ object: resumeAnalyses.object })
			.from(resumeAnalyses)
			.where(
				and(
					eq(resumeAnalyses.resumeId, primaryResume.id),
					eq(resumeAnalyses.userId, userId),
					eq(resumeAnalyses.status, "ready")
				)
			)
			.orderBy(desc(resumeAnalyses.createdAt))
			.limit(1),
	]);

	const signals: ResumeSignals = { skills: [], roleTitles: [] };
	collectResumeSignals(buildBlockTree(blockRows), signals, null);

	const parsedAnalysis = resumeAnalysisSchema.safeParse(analysisRows.at(0)?.object);

	return {
		profile,
		resume: {
			id: primaryResume.id,
			displayName: primaryResume.displayName,
			title: primaryResume.title,
			targetRole: primaryResume.targetRole,
			targetedCompanyIdentifier: primaryResume.targetedCompanyIdentifier,
			skills: dedupeOrdered(signals.skills, MAX_SKILLS),
			roleTitles: dedupeOrdered(signals.roleTitles, MAX_ROLE_TITLES),
			analysis: parsedAnalysis.success ? parsedAnalysis.data : null,
		},
		letters,
	};
}
