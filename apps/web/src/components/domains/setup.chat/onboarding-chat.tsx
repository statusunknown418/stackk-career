import { ArrowBendUpRightIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai-elements/checkpoint";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Spinner } from "@/components/ui/spinner";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type OnboardingAnswerKey = "experience" | "industry" | "targetRole" | "urgency" | "location";

interface OnboardingQuestion {
	id: OnboardingAnswerKey;
	options: string[];
	prompt: string;
}

const QUESTIONS: OnboardingQuestion[] = [
	{
		id: "experience",
		prompt: "¿Cuántos años de experiencia tienes en tu campo?",
		options: ["Recién graduado", "1–3 años", "3–5 años", "5+ años"],
	},
	{
		id: "industry",
		prompt: "¿En qué industria trabajas actualmente?",
		options: ["Software", "Diseño", "Marketing", "Data Science", "Otro"],
	},
	{
		id: "targetRole",
		prompt: "¿Qué tipo de rol estás buscando?",
		options: ["Trainee", "Analista o similar", "Lead", "Manager"],
	},
	{
		id: "urgency",
		prompt: "¿Qué tan urgente es tu búsqueda?",
		options: ["Explorando", "Activo", "Urgente"],
	},
	{
		id: "location",
		prompt: "¿Cuál es tu modalidad preferida?",
		options: ["Remoto", "Híbrido", "Presencial", "Cualquiera"],
	},
];

const UPLOAD_PROMPT = "Perfecto. Para terminar, sube tu CV en PDF y lo analizamos juntos.";
const ANALYZING_PROMPT = "Excelente, ya tengo tu CV. Déjame revisarlo…";
const SKIPPED_ANSWER = "__skipped__" as const;
const SKIPPED_ANSWER_LABEL = "Prefiero omitir esto por ahora";
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
}

export function OnboardingChat({ assistantMessage, isAnalysisStreaming = false }: OnboardingChatProps) {
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
		/>
	);
}

function OnboardingChatInner({
	assistantMessage,
	initialAnswers,
	isAnalysisStreaming,
}: {
	assistantMessage: UIMessage | undefined;
	initialAnswers: Answers;
	isAnalysisStreaming: boolean;
}) {
	const { storeId: fileId, generationId, analysisStatus } = setupRoute.useSearch();
	const navigate = setupRoute.useNavigate();

	const [answers, setAnswers] = useState<Answers>(initialAnswers);

	const turnIndex = nextUnansweredIndex(answers);
	const currentQuestion = QUESTIONS[turnIndex];
	const isFinished = turnIndex >= QUESTIONS.length;
	const hasFile = Boolean(fileId);
	const answeredQuestions = QUESTIONS.slice(0, turnIndex);

	const questionTypewriter = useTypewriter(currentQuestion?.prompt ?? "");
	const uploadTypewriter = useTypewriter(isFinished && !hasFile ? UPLOAD_PROMPT : "");
	const analyzingTypewriter = useTypewriter(isFinished && hasFile ? ANALYZING_PROMPT : "");

	const saveProfile = useMutation(
		orpc.onboardingProfile.upsert.mutationOptions({ onError: showMutationError, retry: 2 })
	);

	function handlePick(answer: string) {
		if (!currentQuestion) {
			return;
		}
		setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
		saveProfile.mutate({ [currentQuestion.id]: answer });
	}

	function handleSkipQuestion() {
		if (!currentQuestion) {
			return;
		}
		setAnswers((prev) => ({ ...prev, [currentQuestion.id]: SKIPPED_ANSWER }));
		saveProfile.mutate({ [currentQuestion.id]: null });
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

		saveProfile.mutate(wipe);
	}

	const reasoningParts = assistantMessage?.parts.filter((part) => part.type === "reasoning") ?? [];
	const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
	const isReasoningStreaming = isAnalysisStreaming && reasoningParts.at(-1)?.state !== "done";

	return (
		<Conversation className="p-0">
			<ConversationContent>
				{answeredQuestions.map((question, index) => (
					<div className="flex flex-col gap-2" key={question.id}>
						<Message from="assistant">
							<MessageContent>
								<p>{question.prompt}</p>
							</MessageContent>
						</Message>

						<Message from="user">
							<MessageContent>
								{answers[question.id] === SKIPPED_ANSWER ? SKIPPED_ANSWER_LABEL : (answers[question.id] ?? "")}
							</MessageContent>
						</Message>

						<Checkpoint>
							<CheckpointIcon />
							<CheckpointTrigger
								onClick={() => handleRestore(index)}
								tooltip="Volver a responder esta pregunta"
								variant="ghost-muted"
							>
								Restaurar <CaretUpIcon />
							</CheckpointTrigger>
						</Checkpoint>
					</div>
				))}

				{currentQuestion && (
					<div className="flex flex-col gap-2">
						<Message from="assistant">
							<MessageContent>
								<p
									className={cn(
										!questionTypewriter.done &&
											"after:ml-0.5 after:inline-block after:animate-pulse after:content-['▍']"
									)}
								>
									{questionTypewriter.displayed}
								</p>
							</MessageContent>
						</Message>

						{questionTypewriter.done && (
							<Suggestions>
								{currentQuestion.options.map((option) => (
									<Suggestion key={option} onClick={handlePick} size="lg" suggestion={option} />
								))}
								<Suggestion
									onClick={handleSkipQuestion}
									size="lg"
									suggestion={SKIPPED_ANSWER_LABEL}
									variant="ghost-muted"
								/>
							</Suggestions>
						)}
					</div>
				)}

				{isFinished && !hasFile && (
					<div className="flex flex-col gap-3">
						<Message from="assistant">
							<MessageContent>
								<p
									className={cn(
										!uploadTypewriter.done && "after:ml-0.5 after:inline-block after:animate-pulse after:content-['▍']"
									)}
								>
									{uploadTypewriter.displayed}
								</p>
							</MessageContent>
						</Message>

						{uploadTypewriter.done && (
							<div className="space-y-3">
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

								<Button className="w-full sm:w-auto" render={<Link to="/dash" />} variant="ghost-muted">
									Continuar sin CV <ArrowBendUpRightIcon />
								</Button>
							</div>
						)}
					</div>
				)}

				{isFinished && hasFile && (
					<div className="flex flex-col gap-3">
						<Message from="assistant">
							<MessageContent>
								<p
									className={cn(
										!analyzingTypewriter.done &&
											"after:ml-0.5 after:inline-block after:animate-pulse after:content-['▍']"
									)}
								>
									{analyzingTypewriter.displayed}
								</p>
							</MessageContent>
						</Message>

						{analysisStatus !== "complete" && <Shimmer className="text-sm">Processing</Shimmer>}

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
				)}
			</ConversationContent>

			<ConversationScrollButton />
		</Conversation>
	);
}
