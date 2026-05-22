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
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { resumeParserInputSchema } from "@stackk-career/schemas/jobs/resume-parser";
import { viewerUsageTag } from "@stackk-career/schemas/subscriptions";
import { generateLexoKeyBetween, withLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { AbortTaskRunError, logger, metadata, schemaTask } from "@trigger.dev/sdk";
import { constructNow, formatDate } from "date-fns";
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

		// 1. Resolve PDF URL (verifies ownership when using fileId)
		metadata.set("step", "resolving_file");
		const resolved = await resolveFile(db, {
			fileId: payload.fileId,
			fileUrl: payload.fileUrl,
			userId: payload.userId,
		});

		// 2. Run the agent — emits events into Trigger metadata as it goes
		metadata.set("step", "running_agent");
		const onEvent = (event: ResumeParserEvent) => {
			metadata.append("events", { ...event, at: Date.now() });
			metadata.set(`phase.${event.kind}`, event.status);
		};
		let agentOutput: Awaited<ReturnType<typeof runResumeParserAgent>>;
		try {
			agentOutput = await runResumeParserAgent({ pdfUrl: resolved.pdfUrl, signal, onEvent });
		} catch (err) {
			// Validation gate failures are deterministic — do not retry & burn LLM cost.
			if (err instanceof Error && err.message.startsWith("Not a resume:")) {
				throw new AbortTaskRunError(err.message);
			}
			throw err;
		}

		logger.info("resume-parser = agent_done", {
			confidence: agentOutput.validation.confidence,
			candidateName: agentOutput.validation.candidateName,
		});

		// 3. Create generation + resume rows
		metadata.set("step", "creating_records");
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

		// 4. Insert root blocks: contact first, then one section row per plan
		metadata.set("step", "inserting_blocks");
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

		// 5. Insert each section's children in parallel (independent subtrees)
		const childResults = await Promise.allSettled(
			sectionPositions.map(({ item: section, position }) => {
				const sectionId = idByPosition.get(position);
				if (sectionId === undefined) {
					throw new Error(`Missing inserted section id for position: ${position}`);
				}
				return insertSectionChildren(db, createdResume.id, sectionId, section);
			})
		);

		for (const result of childResults) {
			if (result.status === "rejected") {
				logger.warn("resume-parser = child_insert_failed", { reason: String(result.reason) });
			}
		}

		metadata.set("step", "complete");

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
	},
});
