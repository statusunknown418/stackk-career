import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import {
	AlignLeftIcon,
	AtSignIcon,
	AwardIcon,
	BriefcaseBusinessIcon,
	CheckCircle2Icon,
	DatabaseIcon,
	FileSearchIcon,
	FolderKanbanIcon,
	GraduationCapIcon,
	HandshakeIcon,
	LayersIcon,
	ListChecksIcon,
	type LucideIcon,
	SparklesIcon,
	UserIcon,
} from "lucide-react";
import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtHeader,
	ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";

const ICON_BY_KIND: Record<ResumeParserEvent["kind"], LucideIcon> = {
	resolving_file: FileSearchIcon,
	running_agent: SparklesIcon,
	creating_records: DatabaseIcon,
	inserting_blocks: LayersIcon,
	complete: CheckCircle2Icon,
	validation: FileSearchIcon,
	outline: ListChecksIcon,
	header: UserIcon,
	experience: BriefcaseBusinessIcon,
	education: GraduationCapIcon,
	certifications: AwardIcon,
	projects: FolderKanbanIcon,
	volunteering: HandshakeIcon,
	skills: SparklesIcon,
	languages: SparklesIcon,
	summary: AlignLeftIcon,
	contact: AtSignIcon,
};

const STATUS_TO_STEP: Record<ResumeParserEvent["status"], "active" | "complete" | "pending"> = {
	running: "active",
	complete: "complete",
	failed: "complete",
	canceled: "complete",
};

const ERROR_STATUSES = new Set<ResumeParserEvent["status"]>(["failed", "canceled"]);

const eventKey = (event: ResumeParserEvent) =>
	`${event.kind}|${(event.title ?? event.toolName ?? event.detail ?? "").toLowerCase()}`;

/** Collapse the event stream so each (kind, title) shows up once with its latest status. */
const collapseEvents = (events: readonly ResumeParserEvent[]): ResumeParserEvent[] => {
	const ordered = events.filter((event) => !event.mock);
	const seenOrder = new Map<string, number>();
	const latestByKey = new Map<string, ResumeParserEvent>();

	ordered.forEach((event, index) => {
		const key = eventKey(event);
		if (!seenOrder.has(key)) {
			seenOrder.set(key, index);
		}
		latestByKey.set(key, event);
	});

	return Array.from(seenOrder.entries())
		.sort(([, leftIndex], [, rightIndex]) => leftIndex - rightIndex)
		.map(([key]) => latestByKey.get(key))
		.filter((event): event is ResumeParserEvent => event !== undefined);
};

interface ResumeParserChainOfThoughtProps {
	defaultOpen?: boolean;
	events: readonly ResumeParserEvent[];
	isStreaming: boolean;
}

export function ResumeParserChainOfThought({
	defaultOpen = true,
	events,
	isStreaming,
}: ResumeParserChainOfThoughtProps): React.ReactElement | null {
	const steps = collapseEvents(events);

	if (steps.length === 0) {
		if (!isStreaming) {
			return null;
		}
		return (
			<ChainOfThought defaultOpen={defaultOpen}>
				<ChainOfThoughtHeader>
					<Shimmer>Analizando CV</Shimmer>
				</ChainOfThoughtHeader>
			</ChainOfThought>
		);
	}

	const headerLabel = isStreaming ? (
		<Shimmer>Analizando CV</Shimmer>
	) : (
		<span>Analisis del CV ({steps.length} pasos)</span>
	);

	return (
		<ChainOfThought defaultOpen={defaultOpen}>
			<ChainOfThoughtHeader>{headerLabel}</ChainOfThoughtHeader>
			<ChainOfThoughtContent>
				{steps.map((event) => {
					const Icon = ICON_BY_KIND[event.kind] ?? SparklesIcon;
					const stepStatus = STATUS_TO_STEP[event.status];
					const isError = ERROR_STATUSES.has(event.status);
					const label = event.title ?? event.toolName ?? event.kind;
					const description = isError ? (event.reason ?? event.detail) : event.detail;

					return (
						<ChainOfThoughtStep
							description={description}
							icon={Icon}
							key={eventKey(event)}
							label={
								<span className="flex items-center gap-2">
									<span className={isError ? "text-destructive" : undefined}>{label}</span>
									{isError && (
										<Badge size="sm" variant="error">
											{event.status === "canceled" ? "Cancelado" : "Falló"}
										</Badge>
									)}
								</span>
							}
							status={stepStatus}
						/>
					);
				})}
			</ChainOfThoughtContent>
		</ChainOfThought>
	);
}
