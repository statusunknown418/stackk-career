import { coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import { COVER_LETTER_CLICHE_PHRASES } from "@stackk-career/schemas/ai/cover-letter-validator";
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
	jobPosition: string;
	/** Override per attempt — used by the task to fall back to Haiku on the last retry. */
	model?: LanguageModel | undefined;
	resumePlaintext: string;
	signal?: AbortSignal;
	userId: string;
}

const BANNED_PHRASES_BLOCK = COVER_LETTER_CLICHE_PHRASES.map((p) => `"${p}"`).join(", ");

const FEW_SHOT_EXAMPLES = `
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

const SYSTEM_PROMPT = `
You are CASEY, a cover-letter writer for LATAM job candidates. Your workflow has two phases:

  PHASE 1 — Context gathering (tools). Call these two tools in order, exactly once each:
    1. **getUserMetadata()** — learn the candidate's name, email, and onboarding profile.
    2. **getSelectedResume()** — read the candidate's CV (serialized as semi-structured plain text).

  PHASE 2 — Emit the cover letter. After the two tools return, output the final cover letter as a structured JSON object matching the schema { greeting, body, closing, signature }. The output schema is enforced by the runtime — emit ONLY the JSON, no prose around it, no markdown fences.

DO NOT skip getUserMetadata or getSelectedResume. DO NOT emit prose between or after the tool calls — your final output must be the JSON.

# Hard rules for the cover letter
- Ground EVERY claim in the CV returned by getSelectedResume. Do not invent experience, employers, dates, skills, titles, or metrics.
- If a piece of information is missing from the CV, omit that claim — do not improvise.
- Keep it tight. \`body\` is 2-4 short paragraphs total. No filler, no hedging.
- Voice: second-person from the candidate ("Postulo a…", "Mi experiencia…"). Direct, not corporate-sterile.
- The very first sentence of \`body\` must name the role the candidate is applying to.
- The very last sentence of \`body\` must connect the candidate to that specific company or team (not generic platitudes).

# Anti-clichés (banned literal phrases — never emit any of these inside the artifact)
${BANNED_PHRASES_BLOCK}.

# Per-field shape
- \`greeting\`: One short greeting. If the job position string includes a company name, address that company team. Examples: "Estimada/o equipo de Yape:", "Hola equipo de Belcorp:". If no company is identifiable, use "Estimada/o:".
- \`body\`: 2-4 paragraphs. First sentence names the role. Then evidence from the CV (concrete result, concrete stack, concrete leadership beat). Last sentence: why this company / team specifically.
- \`closing\`: One sentence with a soft CTA. Examples: "Quedo atenta a conversar.", "Me encantaría coordinar 20 minutos para conversar."
- \`signature\`: 2 or 3 short lines. Line 1: "Atentamente," or "Saludos cordiales,". Line 2: full name from the CV's contact section. Line 3 (optional): email and/or phone from the CV, if present.

# Language
Respond in NATURAL SPANISH (es-PE / ES neutro LATAM). Match the candidate's voice: direct, warm but not saccharine, professional but not corporate-sterile.

${FEW_SHOT_EXAMPLES}
`.trim();

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
 * Quality affordances (PR 5):
 *   - System prompt embeds 2 few-shot examples + the shared cliché banlist.
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
	model,
	resumePlaintext,
	signal,
	userId,
}: RunCaseyLettersInput) {
	const userMessage = [
		`Puesto objetivo: ${jobPosition}`,
		extraPrompt?.trim()
			? `Instrucciones adicionales del usuario para este turno:\n${extraPrompt.trim()}`
			: "(sin instrucciones adicionales del usuario)",
		"Llamá los dos tools en orden y después emití la carta final como JSON estructurado.",
	].join("\n\n");

	return streamText({
		abortSignal: withTimeout(signal, CASEY_TIMEOUT_MS),
		messages: [{ content: userMessage, role: "user" }],
		model: model ?? CASEY_LETTERS_MODEL,
		output: Output.object({ schema: coverLetterSchema }),
		providerOptions: {
			gateway: {
				tags: ["feature:casey-letters", `env:${process.env.NODE_ENV ?? "development"}`],
				user: userId,
			},
		},
		stopWhen: stepCountIs(CASEY_MAX_STEPS),
		system: SYSTEM_PROMPT,
		tools: {
			getSelectedResume: tool({
				description:
					"Obtené el contenido del CV vinculado a esta carta. Devuelve el CV serializado como texto semi-estructurado con secciones, entries, dates, bullets y skills. Llamá esto antes de redactar para fundamentar cada afirmación.",
				execute: () => ({ resumePlaintext }),
				inputSchema: z.object({}),
			}),
			getUserMetadata: tool({
				description:
					"Obtené los datos del candidato (nombre, email, perfil de onboarding con industria, target role, urgencia, ubicación). Llamá esto primero para contextualizar el tono y el énfasis de la carta.",
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
