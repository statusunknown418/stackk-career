import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ResumeAnalysis } from "@/components/domains/setup.analysis/resume-analysis";
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
		options: ["0 años", "1–3 años", "3–5 años", "5+ años"],
	},
	{
		id: "industry",
		prompt: "¿En qué industria trabajas actualmente?",
		options: ["Software", "Diseño", "Marketing", "Data", "Otra"],
	},
	{
		id: "targetRole",
		prompt: "¿Qué tipo de rol estás buscando?",
		options: ["IC", "Lead", "Manager", "Founder"],
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

type Answers = Partial<Record<OnboardingAnswerKey, string>>;

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

export function OnboardingChat() {
	const { data, isLoading } = useQuery(orpc.onboardingProfile.get.queryOptions());

	if (isLoading) {
		return (
			<div className="flex justify-center py-6">
				<Spinner className="size-6" />
			</div>
		);
	}

	return <OnboardingChatInner initialAnswers={pickAnswers(data)} />;
}

function OnboardingChatInner({ initialAnswers }: { initialAnswers: Answers }) {
	const { storeId: fileId, generationId } = setupRoute.useSearch();
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

	return (
		<Conversation className="h-[60vh] p-0">
			<ConversationContent className="flex flex-col gap-6">
				{answeredQuestions.map((question, index) => (
					<div className="flex flex-col gap-2" key={question.id}>
						<Message from="assistant">
							<MessageContent>
								<p>{question.prompt}</p>
							</MessageContent>
						</Message>
						<Message from="user">
							<MessageContent>{answers[question.id] ?? ""}</MessageContent>
							<MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100">
								<MessageAction label="Editar respuesta" onClick={() => handleRestore(index)} tooltip="Editar respuesta">
									<ArrowCounterClockwiseIcon />
								</MessageAction>
							</MessageActions>
						</Message>
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
							<Suggestions className="pl-1">
								{currentQuestion.options.map((option) => (
									<Suggestion key={option} onClick={handlePick} suggestion={option} />
								))}
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
							<Dropzone
								endpoint="resumeUploader"
								onClientUploadComplete={(files) => {
									const storedId = files.at(0)?.serverData.storedId;
									if (!storedId) {
										toast.error("No pudimos registrar el archivo. Intenta de nuevo.");
										return;
									}
									toast.success("CV subido");
									navigate({ search: { step: "chat", generationId, storeId: storedId } });
								}}
								onUploadError={(err) => toast.error(err.message)}
							/>
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

						{analyzingTypewriter.done && <ResumeAnalysis />}
					</div>
				)}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}
