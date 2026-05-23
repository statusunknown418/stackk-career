import {
	type ResumeParserPhase,
	type ResumeParserPhaseStatus,
	type ResumeParserStep,
	resumeParserPhaseStatusSchema,
	resumeParserStepSchema,
} from "@stackk-career/schemas/jobs/resume-parser";

export interface PhaseUi {
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

const RUNNING_AGENT_PHASE_BONUS = 0.15;
const RUNNING_AGENT_MAX = 0.75;

type Meta = Record<string, unknown> | null | undefined;

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

const computeRunningAgentProgress = (meta: Meta): number => {
	const phases: ResumeParserPhase[] = ["header", "entries", "skills"];
	const completed = phases.filter((phase) => readPhaseStatus(meta, phase) === "complete").length;
	const bonus = Math.min(completed * RUNNING_AGENT_PHASE_BONUS, RUNNING_AGENT_MAX - STEP_BASE_PROGRESS.running_agent);
	return STEP_BASE_PROGRESS.running_agent + bonus;
};

interface RawEvent {
	kind?: unknown;
	reason?: unknown;
	status?: unknown;
}

const readValidationReason = (meta: Meta): string | null => {
	const events = meta?.events;
	if (!Array.isArray(events)) {
		return null;
	}
	for (let i = events.length - 1; i >= 0; i -= 1) {
		const event = events[i] as RawEvent | null | undefined;
		if (event?.kind === "validation" && event?.status === "failed" && isString(event.reason)) {
			return event.reason;
		}
	}
	return null;
};

const readDisplayName = (meta: Meta): string | null => {
	const raw = meta?.displayName;
	return isString(raw) ? raw : null;
};

export const mapParserPhase = (metadata: Meta): PhaseUi => {
	const step = readStep(metadata);
	const progress = step === "running_agent" ? computeRunningAgentProgress(metadata) : STEP_BASE_PROGRESS[step];

	return {
		displayName: readDisplayName(metadata),
		label: STEP_LABEL[step],
		progress,
		step,
		validationReason: readValidationReason(metadata),
	};
};
