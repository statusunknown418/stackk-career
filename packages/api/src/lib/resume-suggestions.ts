import { ORPCError } from "@orpc/server";
import { messages } from "@stackk-career/db/schema/messages";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { resumes } from "@stackk-career/db/schema/resumes";
import { getSectionKind } from "@stackk-career/schemas/api/resumes";
import { type SuggestResumeBlockInput, suggestResumeBlockOutputSchema } from "@stackk-career/schemas/api/suggestions";
import { type Block, parseBlock } from "@stackk-career/schemas/db/resume-blocks";
import { type LanguageModel, Output, type StreamTextResult, streamText } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "../context";
import { createManualEmitter, forkRequestLog, toError } from "../logging";

export const RESUME_SUGGESTIONS_MODEL_ID = "xai/grok-4.1-fast-non-reasoning" as LanguageModel;

const MAX_ERROR_LEN = 1000;

export interface ResumeSuggestionsStream {
	textStream: AsyncIterable<string>;
	toTextStreamResponse: () => Response;
	toUIMessageStream: () => StreamTextResult;
}

const findAncestor = <T extends Block["blockType"]>(
	byId: Map<number, Block>,
	block: Block | null,
	blockType: T
): Extract<Block, { blockType: T }> | null => {
	if (!block) {
		return null;
	}

	if (block.blockType === blockType) {
		return block as Extract<Block, { blockType: T }>;
	}

	return findAncestor(byId, block.parentBlockId == null ? null : (byId.get(block.parentBlockId) ?? null), blockType);
};

const buildEntryFacts = (entry: Extract<Block, { blockType: "entry" }> | null) => {
	const content = entry?.content;
	let dateFact: string | null = null;
	if (content && (content.startDate || content.endDate || content.isCurrent)) {
		const endDate = content.isCurrent ? "present" : (content.endDate ?? "?");
		dateFact = `Dates: ${content.startDate ?? "?"} → ${endDate}`;
	}

	return [
		content?.title ? `Title/Role: ${content.title}` : null,
		content?.subtitle ? `Organization: ${content.subtitle}` : null,
		content?.location ? `Location: ${content.location}${content.isRemote ? " (remote)" : ""}` : null,
		dateFact,
	].filter((part) => part != null);
};

const buildPrompt = ({
	input,
	profile,
	blocks,
}: {
	blocks: Block[];
	input: SuggestResumeBlockInput;
	profile: typeof onboardingProfile.$inferSelect | null;
}) => {
	const byId = new Map(blocks.map((block) => [block.id, block]));
	const target = input.blockId == null ? null : (byId.get(input.blockId) ?? null);
	const entry = findAncestor(byId, target, "entry");
	const section = findAncestor(byId, target, "section");
	const entryFacts = buildEntryFacts(entry);

	const sectionBlock =
		section == null
			? ""
			: `\n## Parent section\n- Title: ${section.content.title}\n- Kind: ${getSectionKind(section.content) ?? "custom"}`;
	const entryBlock = entryFacts.length === 0 ? "" : `\n## Parent entry\n${entryFacts.join("\n")}`;

	const system = `You are a senior resume writer and ATS-optimization specialist. You rewrite a single resume block at a time to maximize recruiter signal and ATS match score.

# Content rules
- Produce exactly 3 suggestions.
- Each \`html\` value must be at most 2000 characters.
- Inside \`html\`, use only these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <b>, <i>, <br>. No attributes, no other tags, no markdown.

# Suggestion strategies (one per slot, in order)
1. Quantified impact — lead with measurable outcomes (numbers, %, $, scale, time saved). Use real magnitudes only if present in the supplied context.
2. Leadership & ownership — strong action verbs ("led", "drove", "owned", "architected", "shipped"); foreground decision-making and scope of responsibility.
3. ATS keyword density — pack role-relevant skills, tools, frameworks, methodologies that map to the target role and industry; keep natural phrasing.

# Writing rules
- Ground every claim in the supplied resume context. Never invent employers, dates, metrics, tools, or technologies.
- Mirror the language of the existing content. If empty or ambiguous, write in Spanish (es-ES).
- Preserve tense consistent with the parent entry: current role → present tense; past role → past tense.
- Avoid clichés ("results-driven", "team player", "synergy"), filler adjectives, and passive voice.
- For bullet lists, prefer <ul><li> with one outcome per bullet; start each bullet with a verb.
- Match the existing block's structure: paragraph fields stay <p>; bullet/descriptor fields stay lists.
- Keep first-person implied; do not use "I" or "we".

# Candidate profile
- Target role: ${profile?.targetRole ?? "unspecified"}
- Industry: ${profile?.industry ?? "unspecified"}
- Experience level: ${profile?.experience ?? "unspecified"}

# Block being improved
- Block type: ${input.blockType}
- Field: ${input.field}${sectionBlock}${entryBlock}`;

	const existing = input.existingContent?.trim();
	const prompt = existing
		? `Existing content (HTML):\n${existing}\n\nRewrite into 3 improved versions following the strategies above.`
		: `No existing content yet. Produce 3 strong starter options for this ${input.blockType} (${input.field}) using the parent context above.`;

	return { system, prompt };
};

async function loadResumeContext(
	context: Context,
	userId: string,
	resumeId: string
): Promise<{
	profile: typeof onboardingProfile.$inferSelect | null;
	blocks: Block[];
}> {
	const loadBlocks = () =>
		context.db
			.select()
			.from(resumeBlocks)
			.where(and(eq(resumeBlocks.resumeId, resumeId), isNull(resumeBlocks.deletedAt)));

	const [profileResult, blocksResult] = await Promise.allSettled([
		context.db.select().from(onboardingProfile).where(eq(onboardingProfile.userId, userId)).limit(1),
		loadBlocks(),
	]);

	if (profileResult.status === "rejected") {
		context.log?.error(toError(profileResult.reason));
		context.log?.set({ profileLoadFailed: true });
	}

	let rawBlocks: Awaited<ReturnType<typeof loadBlocks>> = [];

	if (blocksResult.status === "fulfilled") {
		rawBlocks = blocksResult.value;
	} else {
		context.log?.error(toError(blocksResult.reason));
		context.log?.set({ blocksLoadFailed: true, blocksLoadFallback: "retry" });

		rawBlocks = await loadBlocks().catch((retryError) => {
			context.log?.error(toError(retryError));
			context.log?.set({ blocksLoadFallback: "empty" });
			return [];
		});
	}

	return {
		profile: profileResult.status === "fulfilled" ? (profileResult.value[0] ?? null) : null,
		blocks: rawBlocks.map(parseBlock),
	};
}

export async function createResumeSuggestionsStream({
	context,
	input,
	requestSignal,
	streamPath,
}: {
	context: Context;
	input: SuggestResumeBlockInput;
	requestSignal?: AbortSignal;
	streamPath: string;
}): Promise<ResumeSuggestionsStream> {
	const userId = context.session?.user?.id;

	if (!userId) {
		throw new ORPCError("UNAUTHORIZED");
	}

	context.log?.set({
		action: "suggest_resume_block_content",
		user: { id: userId },
		ai: { model: RESUME_SUGGESTIONS_MODEL_ID },
		block: { type: input.blockType, field: input.field, id: input.blockId ?? null },
		resume: { id: input.resumeId },
	});

	const emitLog = context.log ? createManualEmitter(context.log) : () => undefined;

	const [resume] = await context.db
		.select({ id: resumes.id, generationId: resumes.generationId, userId: resumes.userId })
		.from(resumes)
		.where(eq(resumes.id, input.resumeId))
		.$withCache();

	if (!resume || resume.userId !== userId) {
		context.log?.set({ outcome: "resume_not_found" });
		emitLog();
		throw new ORPCError("NOT_FOUND", { message: "CV no encontrado" });
	}

	const { profile, blocks } = await loadResumeContext(context, userId, input.resumeId);
	const { system, prompt } = buildPrompt({ input, profile, blocks });

	const [userMessage] = await context.db
		.insert(messages)
		.values({
			generationId: resume.generationId,
			isAssistant: false,
			objectType: "resume-suggestion",
			content: { input, system, prompt },
		})
		.returning({ id: messages.id });

	const streamLog = context.log
		? forkRequestLog({
				parent: context.log,
				method: "stream",
				operation: "ai.suggestResumeBlockContent",
				path: streamPath,
			})
		: null;

	streamLog?.set({
		ai: { model: RESUME_SUGGESTIONS_MODEL_ID },
		resume: { id: input.resumeId },
		generation: { id: resume.generationId },
		userMessage: { id: userMessage?.id ?? null },
	});

	const emitStreamLog = streamLog ? createManualEmitter(streamLog) : () => undefined;

	const result = streamText({
		model: RESUME_SUGGESTIONS_MODEL_ID,
		system,
		prompt,
		output: Output.object({ schema: suggestResumeBlockOutputSchema }),
		abortSignal: requestSignal,
		onError: async ({ error }) => {
			const err = toError(error);
			streamLog?.error(err);
			streamLog?.set({ outcome: "stream_error", error: err.message });

			await context.db
				.insert(messages)
				.values({
					generationId: resume.generationId,
					isAssistant: true,
					objectType: "resume-suggestion",
					model: RESUME_SUGGESTIONS_MODEL_ID,
					error: err.message.slice(0, MAX_ERROR_LEN),
					object: { suggestions: [], usage: null, finishReason: "error", error: err.message },
				})
				.catch((dbError) => streamLog?.error(toError(dbError)));

			emitStreamLog();
		},
		onFinish: async ({ usage, finishReason }) => {
			const suggestions = await result.output.then(
				(parsed) => parsed?.suggestions ?? [],
				(parseError) => {
					streamLog?.error(toError(parseError));
					return [];
				}
			);

			await context.db
				.insert(messages)
				.values({
					generationId: resume.generationId,
					isAssistant: true,
					objectType: "resume-suggestion",
					model: RESUME_SUGGESTIONS_MODEL_ID,
					error: null,
					object: { suggestions, usage, finishReason, error: null },
				})
				.catch((dbError) => streamLog?.error(toError(dbError)));

			streamLog?.set({
				outcome: suggestions.length > 0 ? "completed" : "empty_object",
				ai: {
					model: RESUME_SUGGESTIONS_MODEL_ID,
					inputTokens: usage?.inputTokens,
					outputTokens: usage?.outputTokens,
					totalTokens: usage?.totalTokens,
					finishReason,
					suggestionsCount: suggestions.length,
				},
			});
			emitStreamLog();
		},
	});

	return {
		textStream: result.textStream,
		toTextStreamResponse: () => result.toTextStreamResponse(),
		toUIMessageStream: () => result.toUIMessageStream(),
	};
}
