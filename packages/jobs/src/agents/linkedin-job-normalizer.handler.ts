import { type JobPosting, jobPostingSchema } from "@stackk-career/schemas/jobs/linkedin-job-fetch";
import { type LanguageModel, Output, streamText } from "ai";
import { withTimeout } from "../lib/user-metadata";

export const LINKEDIN_JOB_NORMALIZER_MODEL: LanguageModel = "google/gemini-3.1-flash-lite";
export const LINKEDIN_JOB_NORMALIZER_OBJECT_TYPE = "linkedin-job-normalizer";

const NORMALIZER_TIMEOUT_MS = Number(process.env.LINKEDIN_JOB_NORMALIZER_TIMEOUT_MS ?? 60 * 1000);
// Provider output can be large/noisy; cap the raw JSON we hand the model to bound token spend.
const RAW_JSON_CHAR_LIMIT = Number(process.env.LINKEDIN_JOB_NORMALIZER_RAW_LIMIT ?? 24_000);

const SYSTEM_PROMPT = `
You normalize a scraped LinkedIn job posting into the provided JSON schema.

Hard rules:
- Ground EVERY field strictly in the supplied raw JSON. Never invent a company, requirement, or skill that is not present.
- If a field is genuinely absent, use null (for scalars) or an empty array (for lists). Do not guess.
- responsibilities / qualifications: short, deduplicated phrases — not full sentences or HTML.
- skills: concrete tools, technologies, methodologies, and named soft skills the posting explicitly asks for.
- keywords: the ATS terms a strong applicant resume should contain to match THIS posting. Lowercase noun phrases, deduplicated, no filler.
- Keep free-text fields (title, summary, responsibilities, qualifications) in the posting's original language.

Output ONLY the JSON object conforming to the provided schema. No prose, no markdown fences.
`.trim();

export interface RunLinkedinJobNormalizerInput {
	raw: unknown;
	signal?: AbortSignal;
	sourceUrl: string;
	userId: string;
}

export async function runLinkedinJobNormalizer({
	raw,
	signal,
	sourceUrl,
	userId,
}: RunLinkedinJobNormalizerInput): Promise<JobPosting> {
	const rawJson = JSON.stringify(raw).slice(0, RAW_JSON_CHAR_LIMIT);

	const result = streamText({
		model: LINKEDIN_JOB_NORMALIZER_MODEL,
		output: Output.object({ schema: jobPostingSchema }),
		abortSignal: withTimeout(signal, NORMALIZER_TIMEOUT_MS),
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: `Source URL: ${sourceUrl}` },
					{ type: "text", text: `Raw scraped job JSON:\n${rawJson}` },
				],
			},
		],
		providerOptions: {
			gateway: {
				user: userId,
				tags: ["feature:linkedin-job-normalizer", `env:${process.env.NODE_ENV ?? "development"}`],
			},
			google: {
				thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
			},
		},
	});

	const object = await result.output;
	return object;
}
