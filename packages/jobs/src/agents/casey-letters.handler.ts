import { coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import { getClichePhrases } from "@stackk-career/schemas/ai/cover-letter-validator";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { type LanguageModel, Output, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const CASEY_LETTERS_MODEL: LanguageModel = "anthropic/claude-sonnet-4-6";
export const CASEY_LETTERS_FALLBACK_MODEL: LanguageModel = "anthropic/claude-haiku-4-5";
export const CASEY_LETTERS_OBJECT_TYPE = "cover-letter-v1";

const CASEY_TIMEOUT_MS = Number(process.env.CASEY_LETTERS_TIMEOUT_MS ?? 4 * 60 * 1000); // 4 min
const CASEY_MAX_STEPS = Number(process.env.CASEY_LETTERS_MAX_STEPS ?? 6); // 3 tools + buffer

export interface RunCaseyLettersInput {
	extraPrompt?: string | undefined;
	jobDescription?: string | undefined;
	jobPosition: string;
	language: CoverLetterLanguage;
	/** Override per attempt — used by the task to fall back to Haiku on the last retry. */
	model?: LanguageModel | undefined;
	resumePlaintext: string;
	signal?: AbortSignal;
	userId: string;
}

const FEW_SHOT_EXAMPLES_ES = `
# Examples (REFERENCE ONLY — do not copy text literally; observe structure, tone, and concreteness)

Example A — Backend engineer postulando a fintech:

\`\`\`json
{
  "greeting": "Estimada/o equipo de Yape:",
  "body": "Postulo al rol de Senior Backend Engineer en su equipo de Pagos. Los últimos cuatro años en Belcorp diseñé y operé los servicios de cobranza que mueven US$ 12M mensuales — Node.js + PostgreSQL, p99 bajo 80ms, despliegues con feature flags y cero downtime. Antes, en Joinnus, redujimos el tiempo de checkout 40% migrando a una arquitectura de eventos con Kafka.\\n\\nLos pagos a escala masiva son un problema que respeto, y Yape lo resolvió antes que cualquier otro en la región. Me interesa entrar al equipo justo en el momento en que están construyendo el rail B2B — exactamente la curva donde mi experiencia con conciliaciones se vuelve útil.",
  "closing": "Me encantaría coordinar 20 minutos para discutir cómo encaja mi experiencia con lo que están construyendo.",
  "signature": "Atentamente,\\nDiego Reyes\\ndiego.reyes@gmail.com · +51 987 654 321"
}
\`\`\`

Example B — Product designer postulando a SaaS de educación:

\`\`\`json
{
  "greeting": "Hola equipo de Platzi:",
  "body": "Postulo a Senior Product Designer en su equipo de Aprendizaje. En Crehana lideré el rediseño del flujo de onboarding de estudiantes — DAU pasó de 28k a 41k en tres meses y la activación a la primera clase subió 18 puntos. Antes, en Globant, manejé el rediseño de la app móvil de Backus, atendiendo 2.4M de usuarios activos sin un regression crítico en producción.\\n\\nMe enfoco en flujos críticos donde un pixel cambia el comportamiento — onboarding, paywalls, primera tarea. Platzi me llama porque están en el momento donde la experiencia de aprendizaje a escala se vuelve diferenciador, no la cantidad de cursos.",
  "closing": "Quedo atenta a conversar sobre los retos del equipo de Aprendizaje.",
  "signature": "Atentamente,\\nMariana Castillo\\nmariana.castillo@hey.com · linkedin.com/in/marianacastillo"
}
\`\`\`

Both examples share what makes a cover letter good:
- First sentence names the exact role.
- Each evidence sentence cites a real prior employer + a concrete metric or stack.
- The last paragraph connects to the company's *specific* moment / problem.
- No filler, no hedging, no clichés from the banlist.
- The signature is short — name plus one contact line.
`.trim();

const FEW_SHOT_EXAMPLES_EN = `
# Examples (REFERENCE ONLY — do not copy text literally; observe structure, tone, and concreteness)

Example A — Backend engineer applying to a payments company:

\`\`\`json
{
  "greeting": "Hi Stripe team:",
  "body": "I'm applying for the Senior Backend Engineer role on your Payments Reliability team. Over the last four years at Mercado Libre I designed and operated the dispute resolution services that processed US$ 8M monthly — Go + PostgreSQL, p99 under 60ms, zero-downtime feature-flag rollouts. Before that at Rappi I cut checkout latency 35% by rebuilding the payment intent pipeline on top of Kafka.\\n\\nPayments at planet scale is a problem I respect, and Stripe set the bar for the industry. I'd love to join right as you're expanding the LATAM rail — exactly the curve where my hands-on experience with reconciliations and BIN-level routing becomes useful.",
  "closing": "I'd love to grab 20 minutes to discuss how my experience could fit what you're building.",
  "signature": "Best,\\nDiego Reyes\\ndiego.reyes@gmail.com · +51 987 654 321"
}
\`\`\`

Example B — Product designer applying to a productivity SaaS:

\`\`\`json
{
  "greeting": "Hi Notion team:",
  "body": "I'm applying for the Senior Product Designer role on your AI Workflows team. At Linear I led the redesign of the issue triage flow — weekly active issues rose from 28k to 41k in three months and the time-to-first-triage dropped 18 percent. Before that at Figma I shipped the comments system rebuild that handles 2.4M daily threads with no major regression in production.\\n\\nI care about the surfaces that change actual behavior — search, command palette, the empty state. Notion calls me because you're at the moment where the AI surface becomes the product, not the wrapper around documents.",
  "closing": "Happy to chat about what your team is shipping next.",
  "signature": "Best,\\nMariana Castillo\\nmariana.castillo@hey.com · linkedin.com/in/marianacastillo"
}
\`\`\`

Both examples share what makes a cover letter good:
- First sentence names the exact role.
- Each evidence sentence cites a real prior employer + a concrete metric or stack.
- The last paragraph connects to the company's *specific* moment / problem.
- No filler, no hedging, no clichés from the banlist.
- The signature is short — name plus one contact line.
`.trim();

interface LanguageBlocks {
	closingExamples: string;
	examplesBlock: string;
	greetingExamplesEn: string;
	greetingExamplesEs: string;
	languageDirective: string;
	signatureLine1: string;
	voiceLine: string;
}

function languageBlocks(language: CoverLetterLanguage): LanguageBlocks {
	if (language === "en") {
		return {
			closingExamples: '"Looking forward to hearing from you.", "I\'d love to grab 20 minutes to chat."',
			examplesBlock: FEW_SHOT_EXAMPLES_EN,
			greetingExamplesEn:
				'"Hi Yape team:", "Hello Belcorp team:". If no company is identifiable, use "Dear hiring team:"',
			greetingExamplesEs: "",
			languageDirective:
				"Respond in NATURAL ENGLISH (American). Match the candidate's voice: direct, warm but not stuffy, professional but not corporate-sterile.",
			signatureLine1: '"Best," or "Sincerely,"',
			voiceLine:
				'Voice: first-person from the candidate ("I\'m applying to…", "My experience…"). Direct, not corporate-sterile.',
		};
	}
	return {
		closingExamples: '"Quedo atenta a conversar.", "Me encantaría coordinar 20 minutos para conversar."',
		examplesBlock: FEW_SHOT_EXAMPLES_ES,
		greetingExamplesEn: "",
		greetingExamplesEs:
			'"Estimada/o equipo de Yape:", "Hola equipo de Belcorp:". Si no se identifica la empresa, usar "Estimada/o:"',
		languageDirective:
			"Respond in NATURAL SPANISH (es-PE / ES neutro LATAM). Match the candidate's voice: direct, warm but not saccharine, professional but not corporate-sterile.",
		signatureLine1: '"Atentamente," o "Saludos cordiales,"',
		voiceLine:
			'Voice: first-person from the candidate ("Postulo a…", "Mi experiencia…"). Direct, not corporate-sterile.',
	};
}

function buildSystemPrompt(language: CoverLetterLanguage): string {
	const blocks = languageBlocks(language);
	const banPhrases = getClichePhrases(language)
		.map((p) => `"${p}"`)
		.join(", ");
	const greetingExamples = language === "en" ? blocks.greetingExamplesEn : blocks.greetingExamplesEs;

	return `
You are CASEY, a cover-letter writer. Your workflow has two phases:

  PHASE 1 — Context gathering (tools). Call these two tools in order, exactly once each:
    1. **getUserMetadata()** — learn the candidate's name, email, and onboarding profile.
    2. **getSelectedResume()** — read the candidate's CV (serialized as semi-structured plain text).

  PHASE 2 — Emit the cover letter. After the two tools return, output the final cover letter as a structured JSON object matching the schema { greeting, body, closing, signature }. The output schema is enforced by the runtime — emit ONLY the JSON, no prose around it, no markdown fences.

DO NOT skip getUserMetadata or getSelectedResume. DO NOT emit prose between or after the tool calls — your final output must be the JSON.

# HARD RULES (NON-NEGOTIABLE — violating any one of these makes the letter unusable)

## 1. CAREER FIDELITY — never invent a different career for the candidate
- The CV defines who the candidate is. You CANNOT pretend they have a career, domain, or trajectory they don't have.
- If the target job is in field Y and the candidate's CV shows experience in field X (with X ≠ Y):
  - Highlight TRANSFERABLE skills ANCHORED on real items from the CV (cite the prior role + a concrete result).
  - BE EXPLICIT that it's a transition. ("Vengo del lado de [X], donde [concrete metric from CV]. Quiero aplicar esa rigurosidad al [Y].")
  - DO NOT pretend the candidate "has been moving toward Y for years" if there's no evidence.
  - DO NOT fabricate experience, projects, or coursework in Y.
- Concrete violation example: CV is for a Marketing Manager + job is "IA Engineer" → writing "Cuento con conocimientos en IA y sistemas inteligentes" is FORBIDDEN.

## 2. CONCRETE-OR-OMIT — every sentence in body must cite a CV fact
- Every claim must be backed by a SPECIFIC item from the CV: an employer name, a metric, a stack/skill listed, a project named, a date range.
- Banned filler sentences (do not emit anything resembling these):
  - "Cuento con conocimientos en las áreas de…"
  - "Mi experiencia me ha permitido desarrollar…"
  - "Tengo experiencia en las áreas de…"
  - "Estoy convencido de que…"
  - "habilidades descritas en mi perfil"
  - "siempre he estado interesado en…"
  - "I have always been passionate about…"
  - "I'm uniquely positioned to…"
- If you cannot back a claim with a specific CV item, OMIT IT. A 2-paragraph honest letter beats a 4-paragraph fluffy one.

## 3. NO FABRICATION — strict whitelist from the CV
You may ONLY mention the following if they are explicitly present in the CV returned by getSelectedResume:
- **Employers**: NEVER invent a company the candidate hasn't worked at.
- **Metrics** (numbers, percentages, monetary amounts, user counts): NEVER invent a number. If the CV says "led a team", do NOT say "led a team of 12" unless 12 is in the CV.
- **Dates**: NEVER invent date ranges or durations.
- **Skills / stacks / tools**: NEVER list a technology not in the CV.
- **Titles / roles**: NEVER invent a job title the candidate didn't hold.
- **Education**: only schools and programs listed. Do NOT invent courses, specializations, or theses.

## 4. NO FAKE ENTHUSIASM — fit must be real
- DO NOT write "siempre he admirado", "me apasiona X desde joven", "I have always been a fan of…" unless there is evidence in the CV or profile.
- The "why this company" comes from the candidate's REAL prior work + the company's REAL public position. NOT from invented personal connection.

## 5. HONESTY OVER FIT — short and true beats long and fluffy
- If the CV is thin (recent grad, sparse work history, career switch with little overlap), the carta MUST be SHORTER, not padded.
- ${blocks.voiceLine}
- The very first sentence of \`body\` must name the role the candidate is applying to.
- The very last sentence of \`body\` must connect the candidate to that specific company or team — and that connection MUST come from real CV material, not invented affinity. If the job position does NOT identify a company, the last sentence connects to the role's domain through real CV evidence instead.

## 6. JOB DESCRIPTION ALIGNMENT — address real employer needs
- If a job description context is provided, analyze it to identify key challenges, technologies, or requirements.
- Prioritize highlighting matching skills, projects, and metrics from the candidate's CV that directly address the specific needs of the job description.
- DO NOT invent or fabricate matching experience (Hard Rule 3 still applies). If the job description asks for skill Z and the candidate does not have it, do not mention Z or pretend they do.

# Anti-clichés (banned literal phrases — never emit any of these inside the artifact)
${banPhrases}.

# Per-field shape
- \`greeting\`: One short greeting. If the job position string includes a company name, address that company team. Examples: ${greetingExamples}.
- \`body\`: 2-4 paragraphs. First sentence names the role. Then evidence from the CV (concrete result, concrete stack, concrete leadership beat). Last sentence: why this company / team specifically.
- \`closing\`: One sentence with a soft CTA. Examples: ${blocks.closingExamples}.
- \`signature\`: 2 or 3 short lines. Line 1: ${blocks.signatureLine1}. Line 2: full name from the CV's contact section. Line 3 (optional): email and/or phone from the CV, if present.

# Language
${blocks.languageDirective}

${blocks.examplesBlock}
`.trim();
}

/**
 * Generate a cover letter from the candidate's CV + a target job position.
 *
 * Hybrid architecture:
 *   - `getUserMetadata` + `getSelectedResume` are AI SDK tools so the chat can
 *     render their calls (per the Letters diagram) and so the model fetches
 *     context on demand. Both calls return their data via `execute`.
 *   - The final emission is enforced via `output: Output.object({ schema })`
 *     instead of a `generateArtifact` tool. AI SDK guarantees the schema is
 *     emitted, unlike a tool that the model can opt to skip.
 *
 * Quality affordances:
 *   - System prompt embeds 2 few-shot examples + the shared cliché banlist.
 *   - Switchable language (es | en) — picks per-language greeting/closing/signature
 *     conventions + voice line + the matching few-shot block.
 *   - Accepts a `model` override so the task can swap to Haiku on the last
 *     retry attempt as a graceful fallback if Sonnet keeps failing.
 *
 * Convention calca `k02-detailed-analysis.handler.ts`: typed model, OBJECT_TYPE
 * constant, `process.env`-driven timeout, `withTimeout` for the abortable cap,
 * `providerOptions.gateway` for telemetry. `stepCountIs(N)` bounds tool round-trips.
 */
export function runCaseyLettersAgent({
	extraPrompt,
	jobPosition,
	jobDescription,
	language,
	model,
	resumePlaintext,
	signal,
	userId,
}: RunCaseyLettersInput) {
	const isEnglish = language === "en";
	const userMessage = isEnglish
		? [
				`Target role: ${jobPosition}`,
				jobDescription?.trim() ? `Job description context:\n${jobDescription.trim()}` : "(no job description provided)",
				extraPrompt?.trim()
					? `Additional instructions from the user for this turn:\n${extraPrompt.trim()}`
					: "(no additional user instructions)",
				"Call both tools in order, then emit the final letter as structured JSON.",
			].join("\n\n")
		: [
				`Puesto objetivo: ${jobPosition}`,
				jobDescription?.trim()
					? `Descripción del puesto / contexto de la oferta:\n${jobDescription.trim()}`
					: "(no se especificó descripción del puesto)",
				extraPrompt?.trim()
					? `Instrucciones adicionales del usuario para este turno:\n${extraPrompt.trim()}`
					: "(sin instrucciones adicionales del usuario)",
				"Llamá los dos tools en orden y después emití la carta final como JSON estructurado.",
			].join("\n\n");

	const toolDescription = {
		getSelectedResume: isEnglish
			? "Fetch the CV linked to this letter. Returns it serialized as semi-structured plain text with sections, entries, dates, bullets and skills. Call this before writing so every claim is grounded."
			: "Obtené el contenido del CV vinculado a esta carta. Devuelve el CV serializado como texto semi-estructurado con secciones, entries, dates, bullets y skills. Llamá esto antes de redactar para fundamentar cada afirmación.",
		getUserMetadata: isEnglish
			? "Fetch the candidate's data (name, email, onboarding profile with industry, target role, urgency, location). Call this first to anchor the tone and emphasis of the letter."
			: "Obtené los datos del candidato (nombre, email, perfil de onboarding con industria, target role, urgencia, ubicación). Llamá esto primero para contextualizar el tono y el énfasis de la carta.",
	};

	return streamText({
		abortSignal: withTimeout(signal, CASEY_TIMEOUT_MS),
		messages: [{ content: userMessage, role: "user" }],
		model: model ?? CASEY_LETTERS_MODEL,
		output: Output.object({ schema: coverLetterSchema }),
		providerOptions: {
			gateway: {
				tags: ["feature:casey-letters", `env:${process.env.NODE_ENV ?? "development"}`, `lang:${language}`],
				user: userId,
			},
		},
		stopWhen: stepCountIs(CASEY_MAX_STEPS),
		system: buildSystemPrompt(language),
		tools: {
			getSelectedResume: tool({
				description: toolDescription.getSelectedResume,
				execute: () => ({ resumePlaintext }),
				inputSchema: z.object({}),
			}),
			getUserMetadata: tool({
				description: toolDescription.getUserMetadata,
				execute: async () => {
					const metadata = await getUserMetadata(userId);
					return (
						metadata ?? {
							profile: null,
							user: { email: null, id: userId, name: null },
						}
					);
				},
				inputSchema: z.object({}),
			}),
		},
	});
}
