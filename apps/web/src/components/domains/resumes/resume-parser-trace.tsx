import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@/components/ai-elements/task";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatResumeParserTraceLine } from "./lib/map-parser-phase";

const STATUS_LABEL: Record<ResumeParserEvent["status"], string> = {
	running: "En curso",
	complete: "Listo",
	failed: "Fallo",
	canceled: "Cancelado",
};

const STATUS_VARIANT: Record<ResumeParserEvent["status"], "secondary" | "success" | "error" | "warning"> = {
	running: "secondary",
	complete: "success",
	failed: "error",
	canceled: "warning",
};

const toToolState = (status: ResumeParserEvent["status"]) => {
	switch (status) {
		case "complete":
			return "output-available" as const;
		case "failed":
		case "canceled":
			return "output-error" as const;
		default:
			return "input-available" as const;
	}
};

interface ResumeParserTraceProps {
	autoScroll?: boolean;
	className?: string;
	emptyLabel?: string;
	events: ResumeParserEvent[];
}

export function ResumeParserTrace({
	autoScroll = false,
	className,
	emptyLabel = "Esperando eventos del parser…",
	events,
}: ResumeParserTraceProps): React.ReactElement {
	return (
		<div className={cn("rounded-xl border bg-muted/20", className)}>
			<ScrollArea className="h-72" scrollbarGutter scrollFade>
				<div className="space-y-3 p-3">
					{events.length === 0 ? (
						<p className="text-muted-foreground text-sm">{emptyLabel}</p>
					) : (
						events.map((event, index) => {
							const title = event.title ?? event.toolName ?? formatResumeParserTraceLine(event);
							const detail = event.detail;
							const reason = event.reason;

							if (event.toolName) {
								return (
									<Tool
										defaultOpen={event.status !== "complete"}
										key={`${event.at ?? index}-${event.kind}-${event.status}`}
									>
										<ToolHeader
											state={toToolState(event.status)}
											title={title}
											toolName={event.toolName}
											type="dynamic-tool"
										/>
										<ToolContent>
											{detail && <p className="text-sm">{detail}</p>}
											{reason && <p className="text-destructive text-sm">{reason}</p>}
											{typeof event.progress === "number" && (
												<p className="text-muted-foreground text-xs tabular-nums">
													{Math.round(event.progress * 100)}%
												</p>
											)}
										</ToolContent>
									</Tool>
								);
							}

							return (
								<Task
									className="rounded-md border bg-background px-3 py-2"
									defaultOpen={event.status !== "complete"}
									key={`${event.at ?? index}-${event.kind}-${event.status}`}
								>
									<TaskTrigger className="w-full" title={title}>
										<div className="flex w-full items-center justify-between gap-3 text-left">
											<div className="min-w-0">
												<p className="truncate font-medium text-sm">{title}</p>
												<p className="truncate text-muted-foreground text-xs">{formatResumeParserTraceLine(event)}</p>
											</div>
											<div className="flex items-center gap-2">
												{event.mock && (
													<Badge size="sm" variant="outline">
														Narracion
													</Badge>
												)}
												<Badge size="sm" variant={STATUS_VARIANT[event.status]}>
													{STATUS_LABEL[event.status]}
												</Badge>
											</div>
										</div>
									</TaskTrigger>
									<TaskContent className="pt-3">
										{detail && <TaskItem>{detail}</TaskItem>}
										{reason && <TaskItem className="text-destructive">{reason}</TaskItem>}
										{typeof event.progress === "number" && (
											<TaskItem className="font-medium tabular-nums">{Math.round(event.progress * 100)}%</TaskItem>
										)}
									</TaskContent>
								</Task>
							);
						})
					)}
					<div
						ref={(node) => {
							if (node && autoScroll) {
								node.scrollIntoView({ block: "end" });
							}
						}}
					/>
				</div>
			</ScrollArea>
		</div>
	);
}
