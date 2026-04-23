import { useChat } from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/ai-sdk";
import { CheckCircleIcon, SparkleIcon } from "@phosphor-icons/react";
import type { AnalyzePhase, AnalyzeResumeUIMessage, AnalyzeStatus } from "@stackk-career/api/routers/ai";
import type { ChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { client } from "@/utils/orpc";
import { Message, MessageContent } from "../ai-elements/message";

const PHASE_ORDER: AnalyzePhase[] = ["analyzing", "complete"];

const PHASE_ICON: Record<AnalyzePhase, React.ComponentType<{ className?: string }>> = {
	analyzing: SparkleIcon,
	complete: CheckCircleIcon,
};

interface ResumeAnalysisProps {
	fileId: string;
}

function getAssistantText(messages: AnalyzeResumeUIMessage[]): string {
	let lastAssistantMessage: AnalyzeResumeUIMessage | undefined;
	for (let i = messages.length - 1; i >= 0; i -= 1) {
		const message = messages[i];
		if (message?.role === "assistant") {
			lastAssistantMessage = message;
			break;
		}
	}
	if (!lastAssistantMessage) {
		return "";
	}
	return lastAssistantMessage.parts
		.filter((p) => p.type === "text")
		.map((p) => p.text)
		.join("");
}

export function ResumeAnalysis({ fileId }: ResumeAnalysisProps) {
	const hasStartedRef = useRef(false);
	const [currentStatus, setCurrentStatus] = useState<AnalyzeStatus | null>(null);

	const transport = useMemo<ChatTransport<AnalyzeResumeUIMessage>>(
		() => ({
			async sendMessages(options) {
				const iterator = await client.ai.analyzeResume({ fileId }, { signal: options.abortSignal });
				return eventIteratorToUnproxiedDataStream(iterator);
			},
			reconnectToStream() {
				throw new Error("CV analysis cannot be resumed.");
			},
		}),
		[fileId]
	);

	const { messages, sendMessage, status, error } = useChat<AnalyzeResumeUIMessage>({
		transport,
		onData: (part) => {
			if (part.type === "data-status") {
				setCurrentStatus(part.data);
			}
		},
	});

	useEffect(() => {
		if (hasStartedRef.current) {
			return;
		}
		hasStartedRef.current = true;
		sendMessage({ text: "analyze" });
	}, [sendMessage]);

	const analysisText = useMemo(() => getAssistantText(messages), [messages]);
	const activeIndex = currentStatus?.phase ? PHASE_ORDER.indexOf(currentStatus.phase) : -1;

	return (
		<div className="grid gap-4">
			<ol className="grid grid-cols-2 gap-2">
				{PHASE_ORDER.map((phase, index) => {
					const Icon = PHASE_ICON[phase];
					const isActive = index === activeIndex;
					const isDone = index < activeIndex || currentStatus?.phase === "complete";

					return (
						<li
							className={cn(
								"flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
								isActive && "border-primary bg-primary/5 text-primary",
								isDone && "border-primary/40 text-primary/80",
								!(isActive || isDone) && "text-muted-foreground"
							)}
							key={phase}
						>
							<Icon className={cn("size-5", isActive && "animate-pulse")} />
							<span className="capitalize">{phase}</span>
						</li>
					);
				})}
			</ol>

			{currentStatus && (
				<p className="flex items-center gap-2 text-muted-foreground text-sm">
					{currentStatus.phase !== "complete" && status === "streaming" && <Spinner className="size-4" />}
					{currentStatus.message}
				</p>
			)}

			{error && (
				<Alert variant="error">
					<AlertTitle>Analysis failed</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}

			{analysisText && (
				<Message from="assistant">
					<MessageContent>{analysisText}</MessageContent>
				</Message>
			)}
		</div>
	);
}
