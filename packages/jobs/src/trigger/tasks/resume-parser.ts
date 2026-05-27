/**
 * Resume parser task.
 *
 * Flow:
 *   1. Resolve PDF URL (fileId or fileUrl).
 *   2. Run agent — validation gate + 9 parallel section extractions. Each phase
 *      emits a progress event forwarded to Trigger metadata.
 *   3. Create generation + resume rows.
 *   4. Insert root blocks (contact + one section per plan).
 *   5. Insert each section's children in parallel.
 *
 * All helpers live under `../lib/resume-parser/*` so they stay reusable.
 */
import { getTriggerDb } from "@stackk-career/db/http";
import { generations } from "@stackk-career/db/schema/generations";
import { resumeAnalyses } from "@stackk-career/db/schema/resume-analyses";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { resumeParserInputSchema } from "@stackk-career/schemas/jobs/resume-parser";
import { viewerUsageTag } from "@stackk-career/schemas/subscriptions";
import { generateLexoKeyBetween, withLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { toError } from "@stackk-career/schemas/utils/to-error";
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { constructNow, formatDate } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";
import {
	RESUME_PARSER_MODEL,
	RESUME_PARSER_OBJECT_TYPE,
	type ResumeParserEvent,
	runResumeParserAgent,
} from "../../agents/resume-parser.handler";
import { fallbackContactFromName, insertSectionChildren } from "../../lib/resume-parser/insert-blocks";
import { planSections } from "../../lib/resume-parser/plan-sections";
import { resolveFile } from "../../lib/resume-parser/resolve-file";
import { resumeParserQueue } from "../queues";

const RECENT_TRACE_LIMIT = 3;
const RESUME_PARSER_MODEL_SLUG = String(RESUME_PARSER_MODEL);
const RESUME_PARSER_PROVIDER = RESUME_PARSER_MODEL_SLUG.split("/", 1)[0] ?? "unknown";
const TRACKED_PHASE_KINDS = new Set<ResumeParserEvent["kind"]>([
	"validation",
	"outline",
	"header",
	"experience",
	"education",
	"certifications",
	"projects",
	"volunteering",
	"skills",
]);

async function insertPlannedSectionChildren({
	createdResumeId,
	db,
	emitTrace,
	idByPosition,
	sectionPositions,
}: {
	createdResumeId: string;
	db: ReturnType<typeof getTriggerDb>;
	emitTrace: (event: ResumeParserEvent) => void;
	idByPosition: Map<string, number>;
	sectionPositions: Array<{ item: ReturnType<typeof planSections>[number]; position: string }>;
}) {
	const childResults = await Promise.allSettled(
		sectionPositions.map(async ({ item: section, position }, index) => {
			const sectionId = idByPosition.get(position);
			if (sectionId === undefined) {
				throw new Error(`Missing inserted section id for position: ${position}`);
			}

			const sectionProgress = Math.min(0.94 + ((index + 1) / Math.max(sectionPositions.length, 1)) * 0.04, 0.98);

			emitTrace({
				kind: section.definition.kind,
				status: "running",
				title: `Insertando ${section.definition.title}`,
				detail: "Sincronizando bloques hijos en borrador",
				progress: sectionProgress,
			});
			emitTrace({
				kind: section.definition.kind,
				status: "running",
				title: `Sincronizando ${section.definition.title}`,
				detail: "Acomodando nodos finales dentro del resume",
				progress: sectionProgress,
				mock: true,
			});

			await insertSectionChildren(db, createdResumeId, sectionId, section);

			emitTrace({
				kind: section.definition.kind,
				status: "complete",
				title: `${section.definition.title} lista`,
				detail: "Seccion insertada en borrador",
				progress: sectionProgress,
			});
		})
	);

	for (const result of childResults) {
		if (result.status === "rejected") {
			logger.warn("resume-parser = child_insert_failed", { reason: String(result.reason) });
		}
	}
}

async function runResumeParserAgentWithObservability({
	attempt,
	onEvent,
	pdfUrl,
	signal,
	userId,
}: {
	attempt: number;
	onEvent: (event: ResumeParserEvent) => void;
	pdfUrl: string;
	signal: AbortSignal;
	userId: string;
}) {
	metadata.set("aiFeature", "resume-parser");
	metadata.set("aiModel", RESUME_PARSER_MODEL_SLUG);
	metadata.set("aiProvider", RESUME_PARSER_PROVIDER);
	metadata.set("aiAttempt", attempt);
	metadata.set("aiStatus", "running");

	logger.info("resume-parser = ai_start", {
		attempt,
		model: RESUME_PARSER_MODEL_SLUG,
		provider: RESUME_PARSER_PROVIDER,
		source: "pdf",
		userId,
	});

	try {
		const agentOutput = await runResumeParserAgent({ pdfUrl, signal, onEvent });
		metadata.set("aiStatus", "completed");
		metadata.set("aiFinishReason", agentOutput.telemetry.finishReason);
		metadata.set("aiCachedInputTokens", agentOutput.telemetry.totalUsage?.cachedInputTokens ?? null);
		metadata.set("aiInputTokens", agentOutput.telemetry.totalUsage?.inputTokens ?? null);
		metadata.set("aiOutputTokens", agentOutput.telemetry.totalUsage?.outputTokens ?? null);
		metadata.set(
			"aiReasoningTokens",
			agentOutput.telemetry.totalUsage?.reasoningTokens ??
				agentOutput.telemetry.totalUsage?.outputTokenDetails.reasoningTokens ??
				null
		);
		metadata.set("aiTotalTokens", agentOutput.telemetry.totalUsage?.totalTokens ?? null);
		metadata.set("aiPhaseTelemetry", agentOutput.telemetry.phases as never);

		logger.info("resume-parser = ai_complete", {
			candidateName: agentOutput.validation.candidateName,
			finishReason: agentOutput.telemetry.finishReason,
			model: RESUME_PARSER_MODEL_SLUG,
			partialFailureCount: agentOutput.telemetry.partialFailureCount,
			phases: agentOutput.telemetry.phases,
			source: "pdf",
			usage: agentOutput.telemetry.totalUsage,
			userId,
			validationConfidence: agentOutput.validation.confidence,
		});

		return agentOutput;
	} catch (error) {
		const message = toError(error).message;
		metadata.set("aiStatus", "failed");
		metadata.set("aiError", message);

		logger.error("resume-parser = ai_failed", {
			error: message,
			model: RESUME_PARSER_MODEL_SLUG,
			source: "pdf",
			userId,
		});

		if (error instanceof Error && error.message.startsWith("Not a resume:")) {
			throw new AbortTaskRunError(error.message);
		}

		throw error;
	}
}

export const resumeParserTask = schemaTask({
	id: "resume-parser",
	queue: resumeParserQueue,
	schema: resumeParserInputSchema,
	maxDuration: 600,
	run: async (payload, { ctx, signal }) => {
		const db = getTriggerDb();

		logger.info("resume-parser = start", {
			userId: payload.userId,
			fileId: payload.fileId ?? null,
			hasFileUrl: Boolean(payload.fileUrl),
			attempt: ctx.attempt.number,
		});

		metadata.set("displayName", payload.displayName ?? null);
		const recentTrace: Record<string, unknown>[] = [];
		let currentStep: ResumeParserEvent["kind"] = "resolving_file";
		let currentProgress = 0;

		const emitTrace = (event: ResumeParserEvent) => {
			const traceEvent = {
				...event,
				at: event.at ?? Date.now(),
			};

			metadata.append("events", traceEvent);
			recentTrace.push(traceEvent);
			if (recentTrace.length > RECENT_TRACE_LIMIT) {
				recentTrace.shift();
			}
			metadata.set("recentTrace", recentTrace as never);

			if (traceEvent.progress !== undefined) {
				currentProgress = traceEvent.progress;
				metadata.set("progress", traceEvent.progress);
			}

			const currentLabel = traceEvent.detail ?? traceEvent.title ?? traceEvent.reason ?? null;
			if (currentLabel) {
				metadata.set("currentLabel", currentLabel);
			}

			if (TRACKED_PHASE_KINDS.has(traceEvent.kind)) {
				metadata.set(`phase.${traceEvent.kind}`, traceEvent.status);
			}
		};

		const beginStep = (
			step: Extract<
				ResumeParserEvent["kind"],
				"resolving_file" | "running_agent" | "creating_records" | "inserting_blocks" | "complete"
			>,
			event: Omit<ResumeParserEvent, "kind" | "status">
		) => {
			currentStep = step;
			metadata.set("step", step);
			emitTrace({ kind: step, status: "running", ...event });
		};

		try {
			// 1. Resolve PDF URL (verifies ownership when using fileId)
			beginStep("resolving_file", {
				title: "Preparando archivo",
				detail: "Resolviendo PDF y validando acceso antes de analizarlo",
				progress: 0.05,
			});
			const resolved = await resolveFile(db, {
				fileId: payload.fileId,
				fileUrl: payload.fileUrl,
				userId: payload.userId,
			});
			emitTrace({
				kind: "resolving_file",
				status: "complete",
				title: "Archivo listo",
				detail: "PDF resuelto. Iniciando analisis del contenido",
				progress: 0.1,
			});

			// 2. Run agent and forward events into metadata + stream
			beginStep("running_agent", {
				title: "Analizando contenido",
				detail: "Leyendo PDF y separando informacion relevante",
				progress: 0.12,
			});
			const onEvent = (event: ResumeParserEvent) => {
				emitTrace(event);
			};
			const agentOutput = await runResumeParserAgentWithObservability({
				attempt: ctx.attempt.number,
				onEvent,
				pdfUrl: resolved.pdfUrl,
				signal,
				userId: payload.userId,
			});

			logger.info("resume-parser = agent_done", {
				confidence: agentOutput.validation.confidence,
				candidateName: agentOutput.validation.candidateName,
				finishReason: agentOutput.telemetry.finishReason,
				usage: agentOutput.telemetry.totalUsage,
			});

			emitTrace({
				kind: "running_agent",
				status: "complete",
				title: "Analisis listo",
				detail: "Extraccion terminada. Preparando borrador editable",
				progress: 0.68,
			});

			// 3. Create generation + resume rows
			beginStep("creating_records", {
				title: "Creando registros",
				detail: "Generando borrador y registro base del CV",
				progress: 0.76,
			});
			emitTrace({
				kind: "creating_records",
				status: "running",
				title: "Ensamblando grafo de resume",
				detail: "Convirtiendo salida del agente en estructura persistible",
				progress: 0.78,
				mock: true,
			});

			const baseTitle =
				payload.displayName ??
				agentOutput.validation.candidateName ??
				`CV importado - ${formatDate(constructNow(new Date()), "PPP")}`;

			const [createdGeneration] = await db
				.insert(generations)
				.values({
					owner: payload.userId,
					type: "resume-creation",
					title: baseTitle,
					summary: agentOutput.validation.reason,
					model: RESUME_PARSER_MODEL,
				})
				.returning({ id: generations.id });

			if (!createdGeneration) {
				throw new Error("Failed to create generation row");
			}

			const [createdResume] = await db
				.insert(resumes)
				.values({
					userId: payload.userId,
					generationId: createdGeneration.id,
					title: agentOutput.validation.candidateName ?? baseTitle,
					displayName: baseTitle,
					aiMetadata: {
						agentScore: Math.round(agentOutput.validation.confidence * 100),
						agentCreated: true,
					},
				})
				.returning({ id: resumes.id });
			if (!createdResume) {
				throw new Error("Failed to create resume row");
			}

			// Backlink prior analyses (from upstream generation, e.g. k02-fast-analysis)
			// to the freshly created resume so the editor's analysis panel can find them.
			if (payload.generationId) {
				try {
					const linked = await db
						.update(resumeAnalyses)
						.set({ resumeId: createdResume.id })
						.where(
							and(
								eq(resumeAnalyses.generationId, payload.generationId),
								eq(resumeAnalyses.userId, payload.userId),
								isNull(resumeAnalyses.resumeId)
							)
						)
						.returning({ id: resumeAnalyses.id });

					metadata.set("linkedAnalysisCount", linked.length);

					logger.info("resume-parser = analyses_linked", {
						count: linked.length,
						resumeId: createdResume.id,
						sourceGenerationId: payload.generationId,
						userId: payload.userId,
					});
				} catch (linkErr) {
					const linkMessage = toError(linkErr).message;
					metadata.set("linkAnalysisStatus", "failed");
					metadata.set("linkAnalysisError", linkMessage);

					logger.warn("resume-parser = analyses_link_failed", {
						error: linkMessage,
						resumeId: createdResume.id,
						sourceGenerationId: payload.generationId,
						userId: payload.userId,
					});
				}
			}

			emitTrace({
				kind: "creating_records",
				status: "complete",
				title: "Registros creados",
				detail: "Borrador base persistido. Insertando secciones",
				progress: 0.84,
			});

			// 4. Insert root blocks: contact first, then one section row per plan
			beginStep("inserting_blocks", {
				title: "Insertando secciones",
				detail: "Creando bloques raiz del documento",
				progress: 0.88,
			});
			const planned = planSections(agentOutput);

			const contactPosition = generateLexoKeyBetween(null, null);
			const sectionPositions = withLexoPositions(planned, contactPosition);

			const contactRow = {
				resumeId: createdResume.id,
				blockType: "contact" as const,
				position: contactPosition,
				content: agentOutput.contact ?? fallbackContactFromName(agentOutput.validation.candidateName),
			};

			const sectionRows = sectionPositions.map(({ item: section, position }) => ({
				resumeId: createdResume.id,
				blockType: "section" as const,
				position,
				content: {
					title: section.definition.title,
					layout: section.definition.layout,
					isCustom: false,
				},
			}));

			const createdRoots = await db
				.insert(resumeBlocks)
				.values([contactRow, ...sectionRows])
				.returning({ id: resumeBlocks.id, position: resumeBlocks.position });
			const idByPosition = new Map(createdRoots.map((row) => [row.position, row.id]));

			emitTrace({
				kind: "contact",
				status: "complete",
				title: "Bloques raiz creados",
				detail: "Contacto y secciones base listos para poblarse",
				progress: 0.91,
			});

			// 5. Insert each section's children in parallel (independent subtrees)
			await insertPlannedSectionChildren({
				createdResumeId: createdResume.id,
				db,
				emitTrace,
				idByPosition,
				sectionPositions,
			});

			currentStep = "complete";
			metadata.set("step", "complete");
			emitTrace({
				kind: "complete",
				status: "complete",
				title: "CV importado",
				detail: "Borrador listo para revisar y editar",
				progress: 1,
			});

			// Bust viewer-cache counters now that resume + generation rows exist.
			await db.$cache.invalidate({
				tags: [
					viewerUsageTag(payload.userId, "resumes_total"),
					viewerUsageTag(payload.userId, "resume_creation_generations_per_cycle"),
				],
			});

			logger.info("resume-parser = completed", {
				resumeId: createdResume.id,
				generationId: createdGeneration.id,
				sections: planned.length,
			});

			return {
				resumeId: createdResume.id,
				generationId: createdGeneration.id,
				fileId: resolved.fileId,
				objectType: RESUME_PARSER_OBJECT_TYPE,
				validation: agentOutput.validation,
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const status = signal.aborted || err instanceof AbortTaskRunError ? "canceled" : "failed";

			emitTrace({
				kind: currentStep,
				status,
				title: status === "canceled" ? "Proceso cancelado" : "Proceso fallido",
				detail: message,
				reason: message,
				progress: currentProgress,
			});

			throw err;
		}
	},
});
