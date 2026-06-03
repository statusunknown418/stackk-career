import { ArrowBendUpRightIcon, CaretLeftIcon, CheckCircleIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ResumeParserChainOfThought } from "@/components/domains/resumes/resume-parser-chain";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Spinner } from "@/components/ui/spinner";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type OnboardingAnswerKey =
	| "experience"
	| "industry"
	| "targetRole"
	| "urgency"
	| "location"
	| "languages"
	| "stuckReason"
	| "referrer";

interface OnboardingQuestion {
	id: OnboardingAnswerKey;
	options: string[];
	prompt: string;
}

const QUESTIONS: OnboardingQuestion[] = [
	{
		id: "experience",
		prompt: "¿Cuántos años de experiencia profesional tienes?",
		options: ["Sin experiencia / Estudiante", "Junior (1–3 años)", "Semi-Senior (3–5 años)", "Senior / Lead (5+ años)"],
	},
	{
		id: "industry",
		prompt: "¿En qué industria o sector te especializas?",
		options: [
			"Software / IT",
			"Diseño / UX",
			"Marketing / Ventas",
			"Data & Analytics",
			"Negocios / Gestión",
			"Otra industria",
		],
	},
	{
		id: "targetRole",
		prompt: "¿Qué nivel de responsabilidad buscas en tu próximo rol?",
		options: ["Prácticas / Trainee", "Especialista / Junior", "Coordinador / Lead", "Gerente / Director"],
	},
	{
		id: "urgency",
		prompt: "¿Cómo describirías tu situación actual de búsqueda?",
		options: ["Solo explorando / Pasivo", "Búsqueda activa", "Necesito empleo urgente"],
	},
	{
		id: "location",
		prompt: "¿Cuál es tu modalidad de trabajo preferida?",
		options: ["Remoto (100% online)", "Híbrido (Mixto)", "Presencial (Oficina)", "Sin preferencia"],
	},
	{
		id: "languages",
		prompt: "Aparte del español, ¿qué otros idiomas dominas y en qué nivel?",
		options: [],
	},
	{
		id: "stuckReason",
		prompt: "¿En qué parte de tu búsqueda laboral te sientes estancado actualmente?",
		options: [
			"No recibo ofertas ni entrevistas",
			"Me cuesta estructurar mi CV",
			"Fallo en las entrevistas técnicas",
			"No sé a qué puestos aplicar",
		],
	},
	{
		id: "referrer",
		prompt: "¿De dónde escuchaste sobre nosotros?",
		options: ["Alvaro social media", "Assendia social media", "Anuncio / Publicidad", "Otro"],
	},
];

const OPTION_EMOJIS: Record<string, string> = {
	"Sin experiencia / Estudiante": "🎓",
	"Junior (1–3 años)": "🌱",
	"Semi-Senior (3–5 años)": "🚀",
	"Senior / Lead (5+ años)": "💼",

	"Software / IT": "💻",
	"Diseño / UX": "🎨",
	"Marketing / Ventas": "📈",
	"Data & Analytics": "📊",
	"Negocios / Gestión": "👔",
	"Otra industria": "🔍",

	"Prácticas / Trainee": "👶",
	"Especialista / Junior": "🔍",
	"Coordinador / Lead": "👑",
	"Gerente / Director": "💼",

	"Solo explorando / Pasivo": "🔍",
	"Búsqueda activa": "⚡",
	"Necesito empleo urgente": "🔥",

	"Remoto (100% online)": "🏠",
	"Híbrido (Mixto)": "🏢",
	"Presencial (Oficina)": "💼",
	"Sin preferencia": "🌍",

	Inglés: "🇬🇧",
	Portugués: "🇵🇹",
	"Otro idioma": "🌍",
	"Ninguno / Solo español": "🇪🇸",

	"Inglés (Básico)": "🌱",
	"Inglés (Intermedio)": "🚀",
	"Inglés (Avanzado)": "💼",
	"Portugués (Básico)": "🌱",
	"Portugués (Intermedio)": "🚀",
	"Portugués (Avanzado)": "💼",
	"Otro (Básico)": "🌱",
	"Otro (Intermedio)": "🚀",
	"Otro (Avanzado)": "💼",

	"No recibo ofertas ni entrevistas": "🔍",
	"Me cuesta estructurar mi CV": "📝",
	"Fallo en las entrevistas técnicas": "🧪",
	"No sé a qué puestos aplicar": "🧭",

	"Alvaro social media": "📱",
	"Assendia social media": "🔗",
	"Anuncio / Publicidad": "📢",
	Otro: "✨",
};

const ANALYZING_PROMPT = "Excelente, ya tengo tu CV. Déjame revisarlo…";
const SKIPPED_ANSWER = "__skipped__" as const;
const SKIP_QUESTION_LABEL = "Prefiero no responder";
const SKIPPED_REPLY_LABEL = "Omitido";
const INVALID_FILE_TOAST = "Archivo no permitido. Sube tu CV en PDF.";

type Answers = Partial<Record<OnboardingAnswerKey, string | typeof SKIPPED_ANSWER>>;

const setupRoute = getRouteApi("/_protected/setup");

const showMutationError = (error: Error) => toast.error(error.message || "Algo salió mal, intenta de nuevo.");

function pickAnswers(row: Partial<Record<OnboardingAnswerKey, string | null>> | null | undefined): Answers {
	if (!row) {
		return {};
	}
	const out: Answers = {};
	for (const q of QUESTIONS) {
		const value = row[q.id];
		if (value) {
			out[q.id] = value;
		}
	}
	return out;
}

function nextUnansweredIndex(answers: Answers): number {
	const idx = QUESTIONS.findIndex((q) => answers[q.id] === undefined);
	return idx === -1 ? QUESTIONS.length : idx;
}

interface OnboardingChatProps {
	assistantMessage?: UIMessage;
	isAnalysisStreaming?: boolean;
	isParserStreaming?: boolean;
	parserEvents?: readonly ResumeParserEvent[];
}

export function OnboardingChat({
	assistantMessage,
	isAnalysisStreaming = false,
	isParserStreaming = false,
	parserEvents = [],
}: OnboardingChatProps) {
	const { data, isLoading } = useQuery(orpc.onboardingProfile.get.queryOptions());

	if (isLoading) {
		return (
			<div className="flex justify-center py-6">
				<Spinner className="size-6" />
			</div>
		);
	}

	return (
		<OnboardingChatInner
			assistantMessage={assistantMessage}
			initialAnswers={pickAnswers(data)}
			isAnalysisStreaming={isAnalysisStreaming}
			isParserStreaming={isParserStreaming}
			parserEvents={parserEvents}
		/>
	);
}

function OnboardingChatInner({
	assistantMessage,
	initialAnswers,
	isAnalysisStreaming,
	isParserStreaming,
	parserEvents,
}: {
	assistantMessage: UIMessage | undefined;
	initialAnswers: Answers;
	isAnalysisStreaming: boolean;
	isParserStreaming: boolean;
	parserEvents: readonly ResumeParserEvent[];
}) {
	const { storeId: fileId, generationId, analysisStatus } = setupRoute.useSearch();
	const navigate = setupRoute.useNavigate();

	const [answers, setAnswers] = useState<Answers>(initialAnswers);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const turnIndex = nextUnansweredIndex(answers);
	const isFinished = turnIndex >= QUESTIONS.length;
	const hasFile = Boolean(fileId);

	const activeIndex = editingIndex === null ? turnIndex : editingIndex;
	const activeQuestion = QUESTIONS[activeIndex];

	const analyzingTypewriter = useTypewriter(isFinished && hasFile ? ANALYZING_PROMPT : "");

	const saveProfile = useMutation(
		orpc.onboardingProfile.upsert.mutationOptions({ onError: showMutationError, retry: 2 })
	);

	function handlePick(answer: string) {
		const q = editingIndex === null ? activeQuestion : QUESTIONS[editingIndex];
		if (!q) {
			return;
		}

		if (editingIndex !== null) {
			setAnswers((prev) => ({ ...prev, [q.id]: answer }));
			saveProfile.mutate({ [q.id]: answer });
			setEditingIndex(null);
			return;
		}

		setAnswers((prev) => ({ ...prev, [q.id]: answer }));
		saveProfile.mutate({ [q.id]: answer });
	}

	function handleSkipQuestion() {
		if (editingIndex !== null) {
			const q = QUESTIONS[editingIndex];
			if (!q) {
				return;
			}
			setAnswers((prev) => ({ ...prev, [q.id]: SKIPPED_ANSWER }));
			saveProfile.mutate({ [q.id]: null });
			setEditingIndex(null);
			return;
		}

		if (!activeQuestion) {
			return;
		}
		setAnswers((prev) => ({ ...prev, [activeQuestion.id]: SKIPPED_ANSWER }));
		saveProfile.mutate({ [activeQuestion.id]: null });
	}

	function handleRestore(index: number) {
		const cleared: Answers = {};

		const wipe: Partial<Record<OnboardingAnswerKey, null>> = {};
		for (let i = 0; i < QUESTIONS.length; i += 1) {
			const q = QUESTIONS[i];
			if (!q) {
				continue;
			}
			if (i < index) {
				cleared[q.id] = answers[q.id];
			} else {
				wipe[q.id] = null;
			}
		}
		setAnswers(cleared);
		setEditingIndex(null);

		saveProfile.mutate(wipe);
	}

	function handleCancel() {
		setEditingIndex(null);
	}

	const reasoningParts = assistantMessage?.parts.filter((part) => part.type === "reasoning") ?? [];
	const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
	const isReasoningStreaming = isAnalysisStreaming && reasoningParts.at(-1)?.state !== "done";

	if (hasFile) {
		return (
			<OnboardingAnalyzingView
				analysisStatus={analysisStatus}
				analyzingTypewriter={analyzingTypewriter}
				isParserStreaming={isParserStreaming}
				isReasoningStreaming={isReasoningStreaming}
				parserEvents={parserEvents}
				reasoningText={reasoningText}
			/>
		);
	}

	return (
		<div className="relative flex w-full flex-1 flex-col overflow-hidden">
			<AnimatePresence mode="wait">
				{!isFinished || editingIndex !== null ? (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="flex w-full flex-1 flex-col"
						exit={{ opacity: 0, y: -15 }}
						initial={{ opacity: 0, y: 15 }}
						key="question-view"
						transition={{ duration: 0.35, ease: "easeInOut" }}
					>
						<OnboardingQuestionView
							activeIndex={activeIndex}
							activeQuestion={activeQuestion}
							answers={answers}
							editingIndex={editingIndex}
							handleCancel={handleCancel}
							handlePick={handlePick}
							handleRestore={handleRestore}
							handleSkipQuestion={handleSkipQuestion}
							turnIndex={turnIndex}
						/>
					</motion.div>
				) : (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="flex w-full flex-1 flex-col"
						exit={{ opacity: 0, y: -15 }}
						initial={{ opacity: 0, y: 15 }}
						key="summary-view"
						transition={{ duration: 0.35, ease: "easeInOut" }}
					>
						<OnboardingSummaryView
							answers={answers}
							generationId={generationId}
							navigate={navigate}
							setEditingIndex={setEditingIndex}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface OnboardingAnalyzingViewProps {
	analysisStatus: "idle" | "complete" | "error" | "aborted" | undefined;
	analyzingTypewriter: ReturnType<typeof useTypewriter>;
	isParserStreaming: boolean;
	isReasoningStreaming: boolean;
	parserEvents: readonly ResumeParserEvent[];
	reasoningText: string;
}

function OnboardingAnalyzingView({
	analyzingTypewriter,
	analysisStatus,
	isParserStreaming,
	parserEvents,
	reasoningText,
	isReasoningStreaming,
}: OnboardingAnalyzingViewProps) {
	return (
		<Conversation className="p-0">
			<ConversationContent>
				<div className="flex flex-col gap-3">
					<Message from="assistant">
						<MessageContent>
							<p
								className={cn(
									!analyzingTypewriter.done && "after:ml-0.5 after:inline-block after:animate-pulse after:content-['▍']"
								)}
							>
								{analyzingTypewriter.displayed}
							</p>
						</MessageContent>
					</Message>

					{analysisStatus !== "complete" && <Shimmer className="text-sm">Processing</Shimmer>}

					{(isParserStreaming || parserEvents.length > 0) && (
						<ResumeParserChainOfThought events={parserEvents} isStreaming={isParserStreaming} />
					)}

					{reasoningText && (
						<Reasoning isStreaming={isReasoningStreaming}>
							<ReasoningTrigger
								getThinkingMessage={(streaming, duration) => {
									if (streaming) {
										return <Shimmer>Pensando…</Shimmer>;
									}
									if (!duration) {
										return <p>Pensé por unos segundos</p>;
									}
									return <p>Pensé por {duration} segundos</p>;
								}}
							/>

							<ReasoningContent>{reasoningText}</ReasoningContent>
						</Reasoning>
					)}
				</div>
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}

interface OnboardingQuestionViewProps {
	activeIndex: number;
	activeQuestion: OnboardingQuestion | undefined;
	answers: Answers;
	editingIndex: number | null;
	handleCancel: () => void;
	handlePick: (answer: string) => void;
	handleRestore: (index: number) => void;
	handleSkipQuestion: () => void;
	turnIndex: number;
}

function OnboardingQuestionView({
	editingIndex,
	turnIndex,
	activeIndex,
	activeQuestion,
	answers,
	handlePick,
	handleSkipQuestion,
	handleRestore,
	handleCancel,
}: OnboardingQuestionViewProps) {
	const progressPercent = ((activeIndex + 1) / QUESTIONS.length) * 100;
	const isLanguages = activeQuestion?.id === "languages";

	return (
		<div className="flex min-h-[500px] w-full flex-1 flex-col justify-between p-2 sm:p-4">
			{/* Progress Indicator */}
			<div className="mx-auto w-full max-w-xl">
				<div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
					<span className="font-semibold uppercase tracking-wider">
						{editingIndex === null ? `Pregunta ${activeIndex + 1} de ${QUESTIONS.length}` : "🔧 Editando respuesta"}
					</span>
					<span className="font-semibold">{Math.round(progressPercent)}%</span>
				</div>
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
					<div
						className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			{/* Centered Question Content */}
			<div className="my-8 flex flex-1 flex-col justify-center">
				<AnimatePresence mode="wait">
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="mx-auto flex w-full max-w-2xl flex-col items-center text-center"
						exit={{ opacity: 0, y: -15 }}
						initial={{ opacity: 0, y: 15 }}
						key={editingIndex === null ? `question-${turnIndex}` : `edit-${editingIndex}`}
						transition={{ duration: 0.25, ease: "easeOut" }}
					>
						<h2 className="mb-10 max-w-2xl bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text font-extrabold text-3xl text-foreground text-transparent tracking-tight sm:text-4xl md:text-5xl md:leading-tight">
							{activeQuestion?.prompt}
						</h2>

						<div className="mx-auto w-full">
							{isLanguages ? (
								<OnboardingLanguagesSelector
									initialValue={answers.languages === SKIPPED_ANSWER ? undefined : answers.languages}
									onSave={handlePick}
									onSkip={handleSkipQuestion}
								/>
							) : (
								<>
									<div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
										{activeQuestion?.options.map((option) => {
											const emoji = OPTION_EMOJIS[option] || "✨";
											return (
												<button
													className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-card/40 px-6 py-5 text-left font-medium text-card-foreground backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-primary/50 hover:bg-card/90 hover:shadow-[0_0_20px_rgba(var(--primary),0.05)] active:scale-[0.98]"
													key={option}
													onClick={() => handlePick(option)}
													type="button"
												>
													<span className="text-3xl transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
														{emoji}
													</span>
													<span className="font-bold text-base text-foreground/90 tracking-tight group-hover:text-foreground">
														{option}
													</span>
												</button>
											);
										})}
									</div>

									<button
										className="mt-10 cursor-pointer font-medium text-muted-foreground text-sm underline underline-offset-4 transition-colors hover:text-foreground"
										onClick={handleSkipQuestion}
										type="button"
									>
										{SKIP_QUESTION_LABEL}
									</button>
								</>
							)}
						</div>
					</motion.div>
				</AnimatePresence>
			</div>

			{/* Navigation Bar */}
			<div className="mx-auto flex w-full max-w-xl items-center justify-between border-border/40 border-t pt-4">
				<OnboardingQuestionNavigation
					editingIndex={editingIndex}
					handleCancel={handleCancel}
					handleRestore={handleRestore}
					turnIndex={turnIndex}
				/>
				<div />
			</div>
		</div>
	);
}

interface OnboardingQuestionNavigationProps {
	editingIndex: number | null;
	handleCancel: () => void;
	handleRestore: (index: number) => void;
	turnIndex: number;
}

function OnboardingQuestionNavigation({
	editingIndex,
	turnIndex,
	handleRestore,
	handleCancel,
}: OnboardingQuestionNavigationProps) {
	if (editingIndex !== null) {
		return (
			<button
				className="flex cursor-pointer items-center gap-1.5 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
				onClick={handleCancel}
				type="button"
			>
				Cancelar edición
			</button>
		);
	}

	if (turnIndex > 0) {
		return (
			<button
				className="flex cursor-pointer items-center gap-1.5 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
				onClick={() => handleRestore(turnIndex - 1)}
				type="button"
			>
				<CaretLeftIcon className="size-4" /> Pregunta anterior
			</button>
		);
	}

	return <div />;
}

interface OnboardingSummaryViewProps {
	answers: Answers;
	generationId: string | undefined;
	navigate: ReturnType<typeof setupRoute.useNavigate>;
	setEditingIndex: (index: number | null) => void;
}

function OnboardingSummaryView({ answers, generationId, setEditingIndex, navigate }: OnboardingSummaryViewProps) {
	return (
		<div className="flex min-h-[500px] w-full flex-1 flex-col overflow-y-auto p-2 sm:p-4">
			<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between">
				<div>
					{/* Header */}
					<div className="mb-8 text-center">
						<div className="mb-4 inline-flex rounded-full bg-success/10 p-3 text-success">
							<CheckCircleIcon className="size-8" />
						</div>
						<h2 className="bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text font-extrabold text-3xl text-foreground text-transparent tracking-tight sm:text-4xl">
							Resumen de tu perfil
						</h2>
						<p className="mt-2 text-muted-foreground text-sm sm:text-base">
							Revisa tus respuestas. Puedes editar cualquiera de ellas si es necesario.
						</p>
					</div>

					{/* Summary Grid */}
					<div className="mb-8 grid gap-3">
						{QUESTIONS.map((question, idx) => {
							const answer = answers[question.id];
							const isSkipped = answer === SKIPPED_ANSWER || !answer;
							const displayAnswer = isSkipped ? SKIPPED_REPLY_LABEL : answer;
							let emoji = isSkipped ? "🤫" : OPTION_EMOJIS[answer] || "✨";

							if (question.id === "languages" && !isSkipped && answer !== "Solo español") {
								emoji = "🌐";
							}

							return (
								<div
									className="group flex items-center justify-between rounded-2xl border border-border/50 bg-card/30 p-5 backdrop-blur-md transition-all duration-200 hover:bg-card/60"
									key={question.id}
								>
									<div className="min-w-0 flex-1 pr-4">
										<p className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
											{question.prompt}
										</p>
										<div className="flex items-center gap-2">
											<span className="text-lg">{emoji}</span>
											<p
												className={cn(
													"truncate font-bold text-foreground text-sm",
													isSkipped && "font-normal text-muted-foreground italic"
												)}
											>
												{displayAnswer}
											</p>
										</div>
									</div>
									<button
										className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background/50 px-3 py-1.5 font-bold text-muted-foreground text-xs shadow-xs transition-all hover:bg-secondary/80 hover:text-foreground"
										onClick={() => setEditingIndex(idx)}
										type="button"
									>
										<PencilSimpleIcon className="size-3.5" />
										Editar
									</button>
								</div>
							);
						})}
					</div>
				</div>

				{/* Call to Action: Dropzone & Continue */}
				<div className="mt-6 border-border/40 border-t pt-8">
					<div className="space-y-4">
						<div className="text-center sm:text-left">
							<h3 className="font-bold text-base text-foreground">Subir tu curriculum vitae (Opcional)</h3>
							<p className="mt-0.5 text-muted-foreground text-xs">
								Formatos aceptados: PDF. Nuestro asistente analizará tu perfil automáticamente.
							</p>
						</div>

						<Dropzone<{ generationId: string | undefined }>
							endpoint="resumeUploader"
							input={{ generationId }}
							onClientUploadComplete={(files) => {
								const storedId = files.at(0)?.serverData.storedId;
								if (!storedId) {
									toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
									return;
								}
								toast.success("CV subido");
								navigate({ search: { step: "chat", generationId, storeId: storedId } });
							}}
							onDragReject={() => toast.error(INVALID_FILE_TOAST)}
							onUploadError={(err) => toast.error(err.message)}
						/>

						<div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row">
							<Button className="w-full font-semibold sm:w-auto" render={<Link to="/dash" />} variant="ghost-muted">
								Continuar sin CV <ArrowBendUpRightIcon />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const LANGUAGES_REGEX = /^([^(]+)\s*\((Básico|Intermedio|Avanzado)\)$/i;

// Custom parser and sub-selector components for languages
function parseLanguagesString(value: string | undefined): Record<string, "Básico" | "Intermedio" | "Avanzado"> {
	const out: Record<string, "Básico" | "Intermedio" | "Avanzado"> = {};
	if (!value || value === "Solo español") {
		return out;
	}

	const parts = value.split(",");
	for (const part of parts) {
		const trimmed = part.trim();
		const match = trimmed.match(LANGUAGES_REGEX);
		if (match) {
			const lang = match[1]?.trim();
			const lvl = match[2] as "Básico" | "Intermedio" | "Avanzado";
			if (lang && lvl) {
				out[lang] = lvl;
			}
		}
	}
	return out;
}

interface OnboardingLanguagesSelectorProps {
	initialValue: string | undefined;
	onSave: (value: string) => void;
	onSkip: () => void;
}

const LANGUAGES_LIST = [
	{ name: "Inglés", emoji: "🇬🇧" },
	{ name: "Portugués", emoji: "🇵🇹" },
	{ name: "Francés", emoji: "🇫🇷" },
	{ name: "Italiano", emoji: "🇮🇹" },
	{ name: "Alemán", emoji: "🇩🇪" },
	{ name: "Otro", emoji: "🌍" },
];

function OnboardingLanguagesSelector({ initialValue, onSave, onSkip }: OnboardingLanguagesSelectorProps) {
	const parsed = parseLanguagesString(initialValue);
	const [selections, setSelections] = useState<Record<string, "Básico" | "Intermedio" | "Avanzado" | null>>(() => {
		const init: Record<string, "Básico" | "Intermedio" | "Avanzado" | null> = {};
		for (const lang of LANGUAGES_LIST) {
			init[lang.name] = parsed[lang.name] || null;
		}
		return init;
	});

	const [onlySpanish, setOnlySpanish] = useState<boolean>(() => !initialValue || initialValue === "Solo español");

	function toggleLevel(lang: string, level: "Básico" | "Intermedio" | "Avanzado") {
		setOnlySpanish(false);
		setSelections((prev) => {
			const current = prev[lang];
			return {
				...prev,
				[lang]: current === level ? null : level,
			};
		});
	}

	function handleOnlySpanish() {
		setOnlySpanish(true);
		setSelections((prev) => {
			const reset: Record<string, null> = {};
			for (const key of Object.keys(prev)) {
				reset[key] = null;
			}
			return reset;
		});
	}

	function handleContinue() {
		if (onlySpanish) {
			onSave("Solo español");
			return;
		}

		const active = Object.entries(selections)
			.filter(([_, level]) => level !== null)
			.map(([lang, level]) => `${lang} (${level})`);

		if (active.length === 0) {
			onSave("Solo español");
		} else {
			onSave(active.join(", "));
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-5">
			<div className="flex flex-col gap-3">
				{LANGUAGES_LIST.map((lang) => {
					const currentLevel = selections[lang.name];
					return (
						<div
							className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-card/25 p-4 backdrop-blur-md transition-all hover:bg-card/35 sm:flex-row sm:items-center sm:justify-between"
							key={lang.name}
						>
							<div className="flex items-center gap-3">
								<span className="text-2xl">{lang.emoji}</span>
								<span className="font-bold text-foreground/90 text-sm tracking-tight sm:text-base">{lang.name}</span>
							</div>

							<div className="flex items-center gap-1.5 self-end sm:self-auto">
								{(["Básico", "Intermedio", "Avanzado"] as const).map((level) => {
									const isActive = currentLevel === level;
									return (
										<button
											className={cn(
												"cursor-pointer select-none rounded-full px-4 py-1.5 font-semibold text-xs transition-all duration-200",
												isActive
													? "border border-primary bg-primary font-bold text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.25)]"
													: "border border-border/50 bg-background/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
											)}
											key={level}
											onClick={() => toggleLevel(lang.name, level)}
											type="button"
										>
											{level}
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			<div className="mt-2 flex flex-col items-center justify-between gap-4 border-border/30 border-t pt-4 sm:flex-row">
				<button
					className={cn(
						"flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 font-semibold text-xs transition-all duration-200",
						onlySpanish
							? "border-primary/40 bg-primary/10 text-primary"
							: "border-border bg-card/30 text-muted-foreground hover:bg-card/60 hover:text-foreground"
					)}
					onClick={handleOnlySpanish}
					type="button"
				>
					🇪🇸 Solo hablo español
				</button>

				<div className="flex w-full items-center justify-end gap-3 sm:w-auto">
					<button
						className="cursor-pointer font-medium text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
						onClick={onSkip}
						type="button"
					>
						Prefiero no responder
					</button>

					<Button
						className="w-full rounded-xl bg-primary px-6 py-2 font-bold text-primary-foreground text-sm transition-all hover:bg-primary/90 sm:w-auto"
						onClick={handleContinue}
						type="button"
					>
						Continuar
					</Button>
				</div>
			</div>
		</div>
	);
}
