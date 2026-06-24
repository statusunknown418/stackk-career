import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ResumeParserTimeline } from "./resume-parser-timeline";

interface ResumeParserTraceProps {
	autoScroll?: boolean;
	className?: string;
	emptyLabel?: string;
	events: ResumeParserEvent[];
}

/** Scrollable, full-history view of the parser stream. Wraps the shared timeline. */
export function ResumeParserTrace({
	autoScroll = false,
	className,
	emptyLabel = "Esperando eventos del parser…",
	events,
}: ResumeParserTraceProps): React.ReactElement {
	return (
		<div className={cn("rounded-xl border bg-muted/20 p-1", className)}>
			<ScrollArea className="h-72" scrollbarGutter scrollFade>
				<div className="p-3">
					<ResumeParserTimeline emptyLabel={emptyLabel} events={events} />
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
