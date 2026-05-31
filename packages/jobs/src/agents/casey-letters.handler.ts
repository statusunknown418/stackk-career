import { coverLetterSchema } from "@stackk-career/schemas/ai/cover-letter";
import { getClichePhrases } from "@stackk-career/schemas/ai/cover-letter-validator";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { type LanguageModel, Output, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getUserMetadata, withTimeout } from "../lib/user-metadata";

export const CASEY_LETTERS_MODEL: LanguageModel = "anthropic/claude-sonnet-4-6";
export const CASEY_LETTERS_FALLBACK_MODEL: LanguageModel = "anthropic/claude-haiku-4-5";

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

Example C — CV SPARSE / estudiante postulando a primera práctica. The CV only had name + email + university (no work history, no listed skills). This is the kind of CV where you must NEVER refuse — you produce a real letter using only what IS there:

\`\`\`json
{
  "greeting": "Estimada/o equipo de Yape:",
  "body": "Postulo al rol de Practicante de Data Science. Soy estudiante de pregrado en la Pontificia Universidad Católica del Perú; las cursos de la carrera me están dando las bases de estadística, programación y análisis de datos que necesito para empezar a trabajar.\\n\\nMe interesa Yape porque es uno de los pocos productos peruanos que opera a escala masiva, y quiero entrar al mundo de data science aplicado a un problema real de pagos en vez de a un dataset académico. Busco una pasantía donde aportar lo que vengo aprendiendo y crecer con un equipo que ya está resolviendo cosas difíciles.",
  "closing": "Quedo atento a coordinar una conversación cuando puedan.",
  "signature": "Atentamente,\\nValeria Cáceres\\na20214567@pucp.edu.pe"
}
\`\`\`

Notice Example C:
- The CV had NO professional experience listed. The letter still got written.
- The body uses ONLY what was in the CV: name, university (inferred from \`@pucp.edu.pe\`), the program (acknowledged as "pregrado" — generic, since the CV didn't specify).
- It does NOT invent specific courses, GPAs, or projects.
- It does NOT contain a single sentence asking the user to update the CV.
- It is 2 paragraphs — shorter than Examples A/B, but still a complete real letter.

What makes a cover letter good:
- First sentence names the exact role.
- Each evidence sentence cites a real prior employer / university / fact (NEVER invents).
- The last paragraph connects to the company's *specific* moment / problem.
- No filler, no hedging, no clichés from the banlist, no refusals, no meta-comments.
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

Example C — SPARSE CV / student applying to their first internship. The CV only had name + email + university (no work history, no listed skills). This is the kind of CV where you must NEVER refuse — you produce a real letter using only what IS in the CV:

\`\`\`json
{
  "greeting": "Hi Cursor team:",
  "body": "I'm applying for the Software Engineering Intern role. I'm an undergraduate student at Pontificia Universidad Católica del Perú; my coursework is giving me the foundations in algorithms, systems programming, and clean code that I need to start contributing.\\n\\nCursor catches my attention because it's one of the few products genuinely re-thinking what an IDE can be once a model is in the loop, instead of bolting AI onto an existing editor. I'd like an internship where I can ship to production and learn from a team operating at this end of the curve.",
  "closing": "I'd love to set up a short call when it works for you.",
  "signature": "Best,\\nValeria Cáceres\\na20214567@pucp.edu.pe"
}
\`\`\`

Notice Example C:
- The CV had NO professional experience listed. The letter still got written.
- The body uses ONLY what was in the CV: name, university (inferred from \`@pucp.edu.pe\`), program (acknowledged as "undergraduate" — generic, since the CV didn't specify).
- It does NOT invent specific courses, GPAs, or projects.
- It does NOT contain a single sentence asking the user to update the CV.
- It is 2 paragraphs — shorter than Examples A/B, but still a complete real letter.

What makes a cover letter good:
- First sentence names the exact role.
- Each evidence sentence cites a real prior employer / university / fact (NEVER invents).
- The last paragraph connects to the company's *specific* moment / problem.
- No filler, no hedging, no clichés from the banlist, no refusals, no meta-comments.
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
- If the CV is thin, the carta MUST be SHORTER (2 paragraphs), NOT a refusal. "Shorter" = less content but still a complete letter. NEVER interpret "shorter" as "skip writing the letter".
- ${blocks.voiceLine}
- The very first sentence of \`body\` must name the role the candidate is applying to.
- The very last sentence of \`body\` must connect the candidate to that specific company or team — and that connection MUST come from real CV material, not invented affinity. If the job position does NOT identify a company, the last sentence connects to the role's domain through real CV evidence instead.

## 6. JOB DESCRIPTION ALIGNMENT — address real employer needs
- If a job description context is provided, analyze it to identify key challenges, technologies, or requirements.
- Prioritize highlighting matching skills, projects, and metrics from the candidate's CV that directly address the specific needs of the job description.
- DO NOT invent or fabricate matching experience (Hard Rule 3 still applies). If the job description asks for skill Z and the candidate does not have it, do not mention Z or pretend they do.
## 7. NEVER REFUSE. NEVER META-COMMENT. ALWAYS PRODUCE A REAL LETTER.
- Your output is ALWAYS a real cover letter directed at the hiring manager / company.
- ABSOLUTELY FORBIDDEN inside body / closing / signature:
  - "Mi CV no cuenta con experiencia documentada / registrada / suficiente…"
  - "Necesito que el CV esté completo para…"
  - "Una vez que actualices tu CV…"
  - "Para redactar una carta honesta necesito más información…"
  - "Con gusto redacto la carta una vez que…"
  - "If you could provide more information about your background…"
  - "My CV does not include enough information for me to…"
- These are META-MESSAGES TO THE USER, not letters. They are NEVER a valid output. If you find yourself wanting to write one, STOP and write Rule 7 instead.

## 8. SPARSE CV HANDLING — write a student / recent-grad letter
If the CV has very little professional content (no work history, just name + email + university), you MUST still produce a complete letter, treating the candidate as a student or recent grad:
- Position with what IS in the CV: their full name (from signature), the university (often derivable from the email domain — \`@pucp.edu.pe\` → Pontificia Universidad Católica del Perú, \`@up.edu.pe\` → Universidad del Pacífico, etc.), and the program if listed.
- Real example of acceptable opening for a thin CV: "Postulo al rol de [puesto]. Soy estudiante de [carrera si está en el CV / 'pregrado'] en la [universidad inferida del email]. Busco una primera oportunidad para [domain del rol] donde aprender en producción."
- 2 paragraphs is enough. The body can be short but must be a REAL letter — a paragraph naming the role + a paragraph connecting to the role's domain via "what I'm studying / what I want to learn".
- DO NOT fabricate coursework, projects, or grades. Acknowledging "estoy aprendiendo X" is fine; claiming "lideré un proyecto de X" is forbidden.
- DO NOT ask the user to update their CV. The body is for the hiring manager, not for the candidate.

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
				"NEVER emit a letter that's a refusal or asks the user to update their CV. If the CV is sparse, follow Rule 7 and write a student / recent-grad letter using only what IS in the CV (name, university inferable from email domain, any listed program).",
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
				"NUNCA emitas una carta que sea una negativa, una excusa, o un pedido de actualizar el CV. Si el CV es delgado, seguí la Regla 7 y escribí una carta de estudiante / recent grad usando SOLO lo que está en el CV (nombre, universidad inferible del dominio del email, programa si está listado).",
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
