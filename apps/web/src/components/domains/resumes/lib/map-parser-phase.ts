import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import {
	type ResumeParserPhase,
	type ResumeParserPhaseStatus,
	type ResumeParserStep,
	resumeParserPhaseSchema,
	resumeParserPhaseStatusSchema,
	resumeParserStepSchema,
} from "@stackk-career/schemas/jobs/resume-parser";

export interface PhaseUi {
	currentLabel: string | null;
	displayName: string | null;
	label: string;
	progress: number;
	step: ResumeParserStep;
	validationReason: string | null;
}

const STEP_LABEL: Record<ResumeParserStep, string> = {
	resolving_file: "Preparando archivo",
	running_agent: "Analizando contenido",
	creating_records: "Guardando borrador",
	inserting_blocks: "Insertando secciones",
	complete: "Listo",
};

const STEP_BASE_PROGRESS: Record<ResumeParserStep, number> = {
	resolving_file: 0.05,
	running_agent: 0.3,
	creating_records: 0.8,
	inserting_blocks: 0.9,
	complete: 1,
};

const RUNNING_AGENT_MAX = 0.75;
const RECENT_TRACE_LIMIT = 3;

type Meta = Record<string, unknown> | null | undefined;

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === "string";

const readStep = (meta: Meta): ResumeParserStep => {
	const raw = meta?.step;
	if (!isString(raw)) {
		return "resolving_file";
	}
	const result = resumeParserStepSchema.safeParse(raw);
	return result.success ? result.data : "resolving_file";
};

const readPhaseStatus = (meta: Meta, phase: ResumeParserPhase): ResumeParserPhaseStatus | null => {
	const raw = meta?.[`phase.${phase}`];
	if (!isString(raw)) {
		return null;
	}
	const result = resumeParserPhaseStatusSchema.safeParse(raw);
	return result.success ? result.data : null;
};

const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

const computeRunningAgentProgress = (meta: Meta): number => {
	const phases: ResumeParserPhase[] = [
		"outline",
		"header",
		"experience",
		"education",
		"certifications",
		"projects",
		"volunteering",
		"skills",
	];
	const completed = phases.filter((phase) => readPhaseStatus(meta, phase) === "complete").length;
	const bonus = Math.min(
		(completed / phases.length) * (RUNNING_AGENT_MAX - STEP_BASE_PROGRESS.running_agent),
		RUNNING_AGENT_MAX - STEP_BASE_PROGRESS.running_agent
	);
	return STEP_BASE_PROGRESS.running_agent + bonus;
};

const readProgress = (meta: Meta): number | null => {
	const raw = meta?.progress;
	return isNumber(raw) ? clampProgress(raw) : null;
};

const readDisplayName = (meta: Meta): string | null => {
	const raw = meta?.displayName;
	return isString(raw) ? raw : null;
};

const readCurrentLabel = (meta: Meta): string | null => {
	const raw = meta?.currentLabel;
	return isString(raw) ? raw : null;
};

const isResumeParserEvent = (value: unknown): value is ResumeParserEvent => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const event = value as Record<string, unknown>;
	const kind = event.kind;
	const status = event.status;

	if (!(isString(kind) && isString(status))) {
		return false;
	}

	const stepResult = resumeParserStepSchema.safeParse(kind);
	const phaseResult = resumeParserPhaseSchema.safeParse(kind);
	const isSectionKind =
		kind === "contact" ||
		kind === "summary" ||
		kind === "experience" ||
		kind === "education" ||
		kind === "skills" ||
		kind === "languages" ||
		kind === "certifications" ||
		kind === "projects" ||
		kind === "volunteering";

	return (
		(stepResult.success || phaseResult.success || isSectionKind) &&
		resumeParserPhaseStatusSchema.safeParse(status).success
	);
};

const getEventKey = (event: ResumeParserEvent) =>
	[
		event.at ?? "na",
		event.kind,
		event.status,
		event.title ?? "",
		event.detail ?? "",
		event.reason ?? "",
		event.toolName ?? "",
		event.mock ? "1" : "0",
	].join("|");

const compareEvents = (left: ResumeParserEvent, right: ResumeParserEvent) => {
	const leftAt = left.at ?? 0;
	const rightAt = right.at ?? 0;
	return leftAt - rightAt;
};

const readMetadataEvents = (meta: Meta, key: "events" | "recentTrace"): ResumeParserEvent[] => {
	const raw = meta?.[key];
	if (!Array.isArray(raw)) {
		return [];
	}

	return raw.filter(isResumeParserEvent).sort(compareEvents);
};

export const mergeResumeParserEvents = (
	meta: Meta,
	streamedEvents: readonly ResumeParserEvent[] | null | undefined = []
): ResumeParserEvent[] => {
	const merged = [...readMetadataEvents(meta, "events"), ...(streamedEvents ?? []).filter(isResumeParserEvent)].sort(
		compareEvents
	);
	const deduped: ResumeParserEvent[] = [];
	const seen = new Set<string>();

	for (const event of merged) {
		const key = getEventKey(event);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		deduped.push(event);
	}

	return deduped;
};

export const readResumeParserRecentTrace = (
	meta: Meta,
	streamedEvents: readonly ResumeParserEvent[] | null | undefined = []
): ResumeParserEvent[] => {
	const metadataRecent = readMetadataEvents(meta, "recentTrace");
	if (streamedEvents && streamedEvents.length > 0) {
		return mergeResumeParserEvents(meta, streamedEvents).slice(-RECENT_TRACE_LIMIT);
	}
	return metadataRecent.length > 0
		? metadataRecent.slice(-RECENT_TRACE_LIMIT)
		: readMetadataEvents(meta, "events").slice(-RECENT_TRACE_LIMIT);
};

export const formatResumeParserTraceLine = (event: ResumeParserEvent): string =>
	event.detail ?? event.title ?? event.reason ?? STEP_LABEL.running_agent;

const readValidationReason = (
	meta: Meta,
	streamedEvents: readonly ResumeParserEvent[] | null | undefined = []
): string | null => {
	const events = mergeResumeParserEvents(meta, streamedEvents);
	for (let i = events.length - 1; i >= 0; i -= 1) {
		const event = events[i];
		if (
			event?.kind === "validation" &&
			(event.status === "failed" || event.status === "canceled") &&
			isString(event.reason)
		) {
			return event.reason;
		}
	}
	return null;
};

export const mapParserPhase = (
	metadata: Meta,
	streamedEvents: readonly ResumeParserEvent[] | null | undefined = []
): PhaseUi => {
	const step = readStep(metadata);
	const progress =
		readProgress(metadata) ??
		(step === "running_agent" ? computeRunningAgentProgress(metadata) : STEP_BASE_PROGRESS[step]);

	return {
		currentLabel: readCurrentLabel(metadata),
		displayName: readDisplayName(metadata),
		label: STEP_LABEL[step],
		progress,
		step,
		validationReason: readValidationReason(metadata, streamedEvents),
	};
};
