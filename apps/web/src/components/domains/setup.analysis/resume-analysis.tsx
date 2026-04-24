import { useChat } from "@ai-sdk/react";
import { eventIteratorToUnproxiedDataStream } from "@orpc/ai-sdk";
import { TriangleDashedIcon } from "@phosphor-icons/react";
import type { AnalyzeResumeUIMessage } from "@stackk-career/api/routers/ai";
import { getRouteApi } from "@tanstack/react-router";
import type { ChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Route } from "@/routes/_protected/setup";
import { client } from "@/utils/orpc";

const setupRoute = getRouteApi("/_protected/setup");

export function ResumeAnalysis() {
	const { storeId: fileId, generationId } = setupRoute.useSearch();
	const navigate = setupRoute.useNavigate();

	const hasStartedRef = useRef(false);

	const transport = useMemo<ChatTransport<AnalyzeResumeUIMessage>>(
		() => ({
			async sendMessages(options) {
				if (!(fileId && generationId)) {
					throw new Error("Missing fileId or generationId");
				}
				const iterator = await client.ai.analyzeResume({ fileId, generationId }, { signal: options.abortSignal });
				return eventIteratorToUnproxiedDataStream(iterator);
			},
			reconnectToStream() {
				throw new Error("CV analysis cannot be resumed.");
			},
		}),
		[fileId, generationId]
	);

	const { messages, sendMessage, status, error } = useChat<AnalyzeResumeUIMessage>({
		transport,
		onFinish: () => {
			navigate({
				to: Route.fullPath,
				search: (prev) => ({ ...prev, analysisStatus: "complete" }),
			});
		},
	});

	useEffect(() => {
		if (hasStartedRef.current) {
			return;
		}
		hasStartedRef.current = true;
		sendMessage({ text: "analyze" });
	}, [sendMessage]);

	const isStreaming = status === "streaming" || status === "submitted";

	return (
		<div className="flex flex-col gap-4">
			{messages.map((message) => {
				if (message.role !== "assistant") {
					return null;
				}

				return (
					<div className="flex flex-col gap-3" key={message.id}>
						{message.parts.map((part, index) => {
							const key = `${message.id}-${index}`;

							if (part.type === "reasoning") {
								const isPartStreaming = isStreaming && part.state !== "done";
								return (
									<Reasoning className="w-full" isStreaming={isPartStreaming} key={key}>
										<ReasoningTrigger />
										<ReasoningContent>{part.text}</ReasoningContent>
									</Reasoning>
								);
							}

							if (part.type === "text") {
								return (
									<Message from="assistant" key={key}>
										<MessageContent>
											<MessageResponse isAnimating={isStreaming}>{part.text}</MessageResponse>
										</MessageContent>
									</Message>
								);
							}

							return null;
						})}
					</div>
				);
			})}

			{error && (
				<Alert variant="error">
					<TriangleDashedIcon />
					<AlertTitle>Analysis failed</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
