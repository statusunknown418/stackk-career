import { z } from "zod";
import { editCategoryEnum } from "./resume-analysis-enums";
import type { ResumeSnapshot } from "./resume-snapshot";

/**
 * Severity of a quality gate.
 * - `blocking`: caps a category and prevents reaching 100 until resolved.
 * - `warning`: signals a weakness but does not hard-cap the score.
 */
export const qualityGateSeverityEnum = z.enum(["blocking", "warning"]);
export type QualityGateSeverity = z.infer<typeof qualityGateSeverityEnum>;

/**
 * How a gate can be resolved.
 * - `one_click`: Casey can fix it from existing resume facts.
 * - `user_input`: requires facts only the user can supply (metrics, dates, …).
 * - `manual_structure`: requires the user to add or restructure resume content.
 */
export const qualityGateResolutionEnum = z.enum(["one_click", "user_input", "manual_structure"]);
export type QualityGateResolution = z.infer<typeof qualityGateResolutionEnum>;

/**
 * A deterministic rubric cap that explains why a category (and therefore the
 * overall score) cannot reach a higher value. Produced by the quality-gate
 * evaluator and surfaced to both Casey and the UI.
 */
export const resumeQualityGateSchema = z.object({
	id: z.string().min(1),
	category: editCategoryEnum,
	cap: z.number().int().min(0).max(100),
	severity: qualityGateSeverityEnum,
	title: z.string().min(1),
	description: z.string().min(1),
	resolvableBy: qualityGateResolutionEnum,
});
export type ResumeQualityGate = z.infer<typeof resumeQualityGateSchema>;

/** Minimum distinct experiences (with content) below which the resume reads as thin. */
const MIN_EXPERIENCE_ENTRIES = 2;
/** Word count (excluding contact) below which the resume is too short to score well. */
const MIN_RESUME_WORDS = 200;

/** Deterministic caps per gate. `100` means "no cap"; kept named to avoid magic numbers. */
const GATE_CAP = {
	missingContact: 30,
	tooFewExperiences: 40,
	missingBullets: 45,
	missingDates: 35,
	duplicateEntries: 25,
	placeholders: 25,
	noMeasurableAchievement: 45,
	tooShort: 30,
	noJobTarget: 85,
} as const;

/**
 * Evaluate the deterministic rubric gates against a resume snapshot. Only
 * high-confidence, code-detectable defects become gates here; ambiguous signals
 * (keyword nuance, tone) are left for Casey to raise as suggestions. Each gate
 * caps exactly one category; the normalizer takes the minimum cap per category.
 * All copy is Spanish (user-facing), enum values stay English.
 */
export function evaluateQualityGates(snapshot: ResumeSnapshot): ResumeQualityGate[] {
	const gates: ResumeQualityGate[] = [];

	if (!snapshot.hasContact) {
		gates.push({
			id: "missing_contact",
			category: "formatting",
			cap: GATE_CAP.missingContact,
			severity: "blocking",
			title: "Falta la sección de contacto",
			description:
				"El currículum no tiene datos de contacto (nombre, correo, teléfono). Agrégalos para que puedan ubicarte.",
			resolvableBy: "manual_structure",
		});
	}

	if (snapshot.experienceEntryCount < MIN_EXPERIENCE_ENTRIES) {
		gates.push({
			id: "too_few_experiences",
			category: "impact",
			cap: GATE_CAP.tooFewExperiences,
			severity: "blocking",
			title: "Muy pocas experiencias con contenido",
			description: `Hay ${snapshot.experienceEntryCount} experiencia(s) con logros. Suma al menos ${MIN_EXPERIENCE_ENTRIES} con viñetas para demostrar trayectoria.`,
			resolvableBy: "manual_structure",
		});
	}

	if (snapshot.entriesMissingBullets.length > 0) {
		gates.push({
			id: "entries_missing_bullets",
			category: "impact",
			cap: GATE_CAP.missingBullets,
			severity: "blocking",
			title: "Experiencias sin viñetas",
			description: `${snapshot.entriesMissingBullets.length} experiencia(s) no describen logros. Agrega viñetas con lo que hiciste y su resultado.`,
			resolvableBy: "manual_structure",
		});
	}

	if (snapshot.entriesMissingDates.length > 0) {
		gates.push({
			id: "entries_missing_dates",
			category: "formatting",
			cap: GATE_CAP.missingDates,
			severity: "blocking",
			title: "Faltan fechas en experiencias",
			description: `${snapshot.entriesMissingDates.length} experiencia(s) no tienen fecha de inicio o fin. Complétalas para dar contexto temporal.`,
			resolvableBy: "user_input",
		});
	}

	if (snapshot.duplicateEntryGroups.length > 0) {
		gates.push({
			id: "duplicate_entries",
			category: "formatting",
			cap: GATE_CAP.duplicateEntries,
			severity: "blocking",
			title: "Hay experiencias duplicadas",
			description:
				"Se repiten experiencias con el mismo título y empresa. Elimina las copias para no restar credibilidad.",
			resolvableBy: "manual_structure",
		});
	}

	if (snapshot.placeholderBlockIds.length > 0) {
		gates.push({
			id: "placeholders_present",
			category: "clarity",
			cap: GATE_CAP.placeholders,
			severity: "blocking",
			title: "Texto con marcadores o notas sin terminar",
			description:
				'Quedan marcadores (p. ej. "X%") o notas internas en el contenido. Reemplázalos por texto real antes de enviar.',
			resolvableBy: "user_input",
		});
	}

	if (!snapshot.hasMeasurableAchievement) {
		gates.push({
			id: "no_measurable_achievement",
			category: "impact",
			cap: GATE_CAP.noMeasurableAchievement,
			severity: "blocking",
			title: "Sin logros cuantificables",
			description:
				"No hay métricas (números, porcentajes o montos) en ninguna experiencia. Agrega cifras reales de tu impacto.",
			resolvableBy: "user_input",
		});
	}

	if (snapshot.wordCountExcludingContact < MIN_RESUME_WORDS) {
		gates.push({
			id: "resume_too_short",
			category: "length",
			cap: GATE_CAP.tooShort,
			severity: "blocking",
			title: "Currículum demasiado corto",
			description: `El contenido tiene ${snapshot.wordCountExcludingContact} palabras (sin contar contacto). Desarrolla más tus experiencias.`,
			resolvableBy: "manual_structure",
		});
	}

	if (!snapshot.hasJobTarget) {
		gates.push({
			id: "no_job_target",
			category: "keywords",
			cap: GATE_CAP.noJobTarget,
			severity: "blocking",
			title: "Sin puesto objetivo",
			description:
				"No hay un puesto objetivo para comparar. Agrega el enlace de la vacante para puntuar la coincidencia y poder llegar a 100.",
			resolvableBy: "manual_structure",
		});
	}

	return gates;
}
