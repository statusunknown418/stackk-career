import { getTriggerDb } from "@stackk-career/db/http";
import { user } from "@stackk-career/db/schema/auth";
import { onboardingProfile } from "@stackk-career/db/schema/onboarding-profile";
import { resumeAnalysisSchema } from "@stackk-career/schemas/ai/resume-analysis";
import { Output, streamText } from "ai";
import { eq } from "drizzle-orm";

export const K02_FAST_ANALYSIS_MODEL = "google/gemini-3-flash";
export const K02_FAST_ANALYSIS_OBJECT_TYPE = "resume-analysis-fast";

export interface RunK02FastAnalysisInput {
	pdfUrl: string;
	signal?: AbortSignal;
	userId: string;
}

interface UserMetadata {
	profile: {
		experience: string | null;
		industry: string | null;
		targetRole: string | null;
		urgency: string | null;
		location: string | null;
	} | null;
	user: { id: string; name: string | null; email: string | null };
}

async function getUserMetadata(userId: string): Promise<UserMetadata | null> {
	const db = getTriggerDb();

	const [row] = await db
		.select()
		.from(user)
		.where(eq(user.id, userId))
		.leftJoin(onboardingProfile, eq(onboardingProfile.userId, userId))
		.limit(1)
		.$withCache();

	if (!row?.user.id) {
		return null;
	}

	return {
		user: { id: row.user.id, name: row.user.name ?? null, email: row.user.email ?? null },
		profile: row.onboarding_profile
			? {
					experience: row.onboarding_profile.experience ?? null,
					industry: row.onboarding_profile.industry ?? null,
					targetRole: row.onboarding_profile.targetRole ?? null,
					urgency: row.onboarding_profile.urgency ?? null,
					location: row.onboarding_profile.location ?? null,
				}
			: null,
	};
}

const SYSTEM_PROMPT = `
You are an expert resume analyst. Analyze the attached PDF resume and return structured JSON conforming to the provided schema.

# Guardrails:
- You should REJECT any file that doesn't look like a resume, anything other than resumes will NOT be processed by you
- DO NOT attempt to analyze files that do not have a resume-like structure

Hard rules:
- Ground every score and suggestion strictly in the PDF content. Do not invent experience, skills, or facts.
- Score each dimension from 0 to 100 (impact, keywords, clarity, formatting, length). Set scoreOverall as the weighted overall (impact 30%, keywords 25%, clarity 20%, formatting 15%, length 10%).
- Return AT MOST 5 edits, ranked by delta descending. Each delta represents the score points the edit would add (1-20). THE TOTAL SUM + DELTAS SHOULD NOT SURPASS 100
- For every edit:
  - category: which sub-score the edit raises.
  - severity: "top-win" (a clear quantifiable improvement), "missing" (an item absent vs expected), or "soft-signal" (minor polish).
  - title: short imperative phrase.
  - description: 1-2 short sentences with a concrete before/after grounded in the PDF.
- No generic advice. No filler. No hedging.

Output:
- Output ONLY the JSON object conforming to the provided schema. No prose, no markdown fences, no explanation.

Language:
- Respond in SPANISH for every "title" and "description" string. Keep enum values (category, severity) in English exactly as defined.
`.trim();

export async function runK02FastAnalysisAgent({ pdfUrl, userId, signal }: RunK02FastAnalysisInput) {
	const metadata = await getUserMetadata(userId);

	const userContextText = metadata
		? `User context (use to tailor suggestions, do not invent facts beyond the resume):\n${JSON.stringify(metadata, null, 2)}`
		: "User context: not available. Base every suggestion strictly on the PDF.";

	return streamText({
		model: K02_FAST_ANALYSIS_MODEL,
		output: Output.object({ schema: resumeAnalysisSchema }),
		abortSignal: signal,
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: userContextText },
					{ type: "text", text: "Analyze the attached resume PDF and return structured suggestions." },
					{
						type: "file",
						data: new URL(pdfUrl),
						mediaType: "application/pdf",
						filename: "resume.pdf",
					},
				],
			},
		],
	});
}
