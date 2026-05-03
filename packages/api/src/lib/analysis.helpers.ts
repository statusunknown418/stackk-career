import { type ResumeAnalysis, resumeAnalysisScoreBreakdownKeys } from "@stackk-career/schemas/ai/resume-analysis";
import type {
	ResumeAnalysisHistoryDiff,
	ResumeAnalysisScoreDelta,
	ResumeEditSummary,
} from "@stackk-career/schemas/api/generations";

const createScoreDelta = (from: number, to: number): ResumeAnalysisScoreDelta => ({
	from,
	to,
	delta: to - from,
});

const createEditKey = (edit: ResumeAnalysis["edits"][number]): string => `${edit.category}:${edit.title}`;

const createEditSummary = (edit: ResumeAnalysis["edits"][number]): ResumeEditSummary => ({
	category: edit.category,
	delta: edit.delta,
	severity: edit.severity,
	title: edit.title,
});

export const createResumeAnalysisDiff = (
	current: ResumeAnalysis | null,
	baselineAnalysis: ResumeAnalysis | null,
	baselineAnalysisId: string | null
): ResumeAnalysisHistoryDiff => {
	if (!(current && baselineAnalysis)) {
		return {
			baselineAnalysisId: null,
			edits: null,
			scoreOverall: null,
			scoreBreakdown: null,
		};
	}

	const scoreBreakdown = {} as NonNullable<ResumeAnalysisHistoryDiff["scoreBreakdown"]>;
	for (const key of resumeAnalysisScoreBreakdownKeys) {
		scoreBreakdown[key] = createScoreDelta(baselineAnalysis.scoreBreakdown[key], current.scoreBreakdown[key]);
	}

	const currentEditKeys = new Set(current.edits.map(createEditKey));
	const baselineEditKeys = new Set(baselineAnalysis.edits.map(createEditKey));
	const added: ResumeEditSummary[] = [];
	const removed: ResumeEditSummary[] = [];
	const unchanged: ResumeEditSummary[] = [];

	for (const edit of current.edits) {
		if (baselineEditKeys.has(createEditKey(edit))) {
			unchanged.push(createEditSummary(edit));
			continue;
		}
		added.push(createEditSummary(edit));
	}

	for (const edit of baselineAnalysis.edits) {
		if (!currentEditKeys.has(createEditKey(edit))) {
			removed.push(createEditSummary(edit));
		}
	}

	return {
		baselineAnalysisId,
		edits: { added, removed, unchanged },
		scoreOverall: createScoreDelta(baselineAnalysis.scoreOverall, current.scoreOverall),
		scoreBreakdown,
	};
};
