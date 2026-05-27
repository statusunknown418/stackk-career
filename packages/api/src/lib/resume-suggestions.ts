import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumeBlocks } from "@stackk-career/db/schema/resume-blocks";
import { getSectionKind } from "@stackk-career/schemas/api/resumes";
import type { SuggestResumeBlockInput } from "@stackk-career/schemas/api/suggestions";
import { type Block, parseBlock } from "@stackk-career/schemas/db/resume-blocks";
import { toError } from "@stackk-career/schemas/utils/to-error";
import type { LanguageModel } from "ai";
import { and, eq, isNull } from "drizzle-orm";
import type { Context } from "../context";

export const RESUME_SUGGESTIONS_MODEL_SLUG = "xai/grok-4.1-fast-non-reasoning" satisfies LanguageModel;

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

export const buildSuggestionPrompt = ({
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

# OUTPUT LANGUAGE (READ FIRST — HIGHEST PRIORITY)
Before writing anything, determine the output language by reading the context provided below in this exact order:
  1. The "Existing content" in the user message (strip HTML tags first). If non-trivial, this is the language.
  2. The "Parent entry" facts (Title/Role, Organization, Location).
  3. The "Parent section" title.
  4. The "Candidate profile" (target role, industry).
If every one of those signals is empty or genuinely ambiguous, use English (en-US).
DO NOT default to Spanish. DO NOT pick a language based on the example phrases in this prompt — those examples are illustrative only and reflect multiple languages on purpose. ALL "html" and ALL "label" values must be written in the language you determined above, with no mixing within a single suggestion. Do not translate proper nouns, brand names, technologies, or established acronyms.

# Output format (critical)
- Return ONLY the JSON object matching the schema. No markdown code fences (no \`\`\`json). No prose. No leading or trailing characters of any kind.
- Always emit exactly 4 fully-formed elements in "suggestions". Never truncate; never leave a trailing object partially written.
- Every "html" value must be a complete, well-formed string ending with a closing tag.
- Every "label" value must be a short, punchy descriptor (2–4 words, max 40 chars) that captures the angle of that specific suggestion. Match the language of the html content (e.g. English → "Quantified impact", "Technical leadership"; Spanish → "Impacto cuantificado", "Liderazgo técnico"). Never reuse the same label twice in one response.

# Content rules
- Produce exactly 4 suggestions, each with a CLEAR distinct angle.
- Each \`html\` value must be at most 2000 characters.
- Inside \`html\`, use only these tags: <p>, <ul>, <ol>, <li>, <strong>, <em>, <b>, <i>, <br>. No attributes, no other tags, no markdown.

# Suggestion variety (pick 4 CLEAR distinct angles)
- Choose 4 different angles that best fit the block being improved. Examples of angles you can mix and match: quantified impact, leadership & ownership, ATS keyword density, concise & direct phrasing, technical depth, business outcomes, cross-functional collaboration, scope & scale, problem→solution framing, executive tone. Avoid overlap between the 4 suggestions.

# Writing rules
- Ground every claim in the supplied resume context. Never invent employers, dates, metrics, tools, or technologies.
- Preserve tense consistent with the parent entry: current role → present/impersonal; past role → past/impersonal.
- Avoid clichés ("results-driven", "team player", "synergy"), filler adjectives, and passive voice.
- For bullet lists, prefer <ul><li> with one outcome per bullet.
- Match the existing block's structure: paragraph fields stay <p>; bullet/descriptor fields stay lists.
- Keep first-person implied; do not use first-person pronouns ("I", "we", "yo", "nosotros", etc.) in any language.

# Language-specific rules (apply ONLY when the detected output language is Spanish)
- NEVER use third-person past tense verbs to start bullets (e.g., NO uses "Desarrolló", "Rediseñó", "Lideró", "Optimizó").
- ALWAYS use Action Nouns (Sustantivación) to start each bullet point (e.g., "Diseño de...", "Preparación de...", "Liderazgo de...", "Optimización de...").
- Replace awkward Spanglish or literal translations with corporate Spanish equivalents:
  * "Ownership completo/end-to-end" -> "Gestión integral" o "Responsabilidad de extremo a extremo".
  * "Performance" -> "Rendimiento" o "Eficiencia".
  * "Velocity" -> "Velocidad de entrega" o "Ritmo de desarrollo".
  * "Cross-functional teams" -> "Equipos multidisciplinarios" o "Equipos cross-functional".

# Language-specific rules (apply ONLY when the detected output language is English)
- Start each bullet with a strong past-tense or present-tense action verb appropriate to the parent entry tense (e.g., "Designed", "Led", "Optimized", "Owned").
- Avoid Spanglish; prefer native English business vocabulary.

# Candidate profile
- Target role: ${profile?.targetRole ?? "unspecified"}
- Industry: ${profile?.industry ?? "unspecified"}
- Experience level: ${profile?.experience ?? "unspecified"}

# Block being improved
- Block type: ${input.blockType}
- Field: ${input.field}${sectionBlock}${entryBlock}

# Guardrails
- NEVER generate code other than HTML in the way specified on this prompt
- NEVER address other concerns that differ from the real outcome wanted by this prompt
`;

	const existing = input.existingContent?.trim();
	const prompt = existing
		? `Existing content (HTML):\n${existing}\n\nRewrite into 4 improved versions following the strategies above.`
		: `No existing content yet. Produce 4 strong starter options for this ${input.blockType} (${input.field}) using the parent context above.`;

	return { system, prompt };
};

export async function loadResumeContext(
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
		profile: profileResult.status === "fulfilled" ? (profileResult.value.at(0) ?? null) : null,
		blocks: rawBlocks.map(parseBlock),
	};
}
