import type { ResumeParserEvent } from "@stackk-career/jobs/agents/resume-parser.handler";
import {
	AlignLeftIcon,
	AtSignIcon,
	AwardIcon,
	BriefcaseBusinessIcon,
	CheckIcon,
	DatabaseIcon,
	FileSearchIcon,
	FolderKanbanIcon,
	GraduationCapIcon,
	HandshakeIcon,
	LanguagesIcon,
	LayersIcon,
	ListChecksIcon,
	type LucideIcon,
	SparklesIcon,
	UserIcon,
	WrenchIcon,
	XIcon,
} from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

/** Lucide glyph per parser event kind. Shared so every parser surface stays visually in sync. */
export const ICON_BY_KIND: Record<ResumeParserEvent["kind"], LucideIcon> = {
	resolving_file: FileSearchIcon,
	running_agent: SparklesIcon,
	creating_records: DatabaseIcon,
	inserting_blocks: LayersIcon,
	complete: CheckIcon,
	validation: FileSearchIcon,
	outline: ListChecksIcon,
	header: UserIcon,
	experience: BriefcaseBusinessIcon,
	education: GraduationCapIcon,
	certifications: AwardIcon,
	projects: FolderKanbanIcon,
	volunteering: HandshakeIcon,
	skills: SparklesIcon,
	languages: LanguagesIcon,
	summary: AlignLeftIcon,
	contact: AtSignIcon,
};

/** Human label per kind, used as a title fallback when an event omits one. */
export const KIND_LABEL: Record<ResumeParserEvent["kind"], string> = {
	resolving_file: "Preparando archivo",
	running_agent: "Analizando contenido",
	creating_records: "Guardando borrador",
	inserting_blocks: "Insertando secciones",
	complete: "Listo",
	validation: "Validando CV",
	outline: "Esquema del CV",
	header: "Datos personales",
	experience: "Experiencia",
	education: "Educación",
	certifications: "Certificaciones",
	projects: "Proyectos",
	volunteering: "Voluntariado",
	skills: "Habilidades",
	languages: "Idiomas",
	summary: "Resumen",
	contact: "Contacto",
};

type TimelineDensity = "comfortable" | "compact";
type TimelineState = "complete" | "failed" | "pending" | "running";

const STATE_BY_STATUS: Record<ResumeParserEvent["status"], TimelineState> = {
	canceled: "failed",
	complete: "complete",
	failed: "failed",
	running: "running",
};

const NODE_CLASS: Record<TimelineState, string> = {
	complete: "border-success/25 bg-success/10 text-success-foreground",
	failed: "border-destructive/25 bg-destructive/10 text-destructive",
	pending: "border-border bg-muted text-muted-foreground",
	running: "border-info/30 bg-info/10 text-info-foreground",
};

const TITLE_CLASS: Record<TimelineState, string> = {
	complete: "text-muted-foreground",
	failed: "text-destructive",
	pending: "text-foreground",
	running: "text-foreground",
};

const NODE_SIZE: Record<TimelineDensity, string> = {
	comfortable: "size-7",
	compact: "size-6",
};

const ICON_SIZE: Record<TimelineDensity, string> = {
	comfortable: "size-3.5",
	compact: "size-3",
};

const ROW_GAP: Record<TimelineDensity, string> = {
	comfortable: "pb-4",
	compact: "pb-3",
};

interface ResumeParserTimelineProps {
	className?: string;
	density?: TimelineDensity;
	emptyLabel?: string;
	events: readonly ResumeParserEvent[];
}

/**
 * Vertical, connected activity feed for the resume parser stream. Each event is
 * a node on a single rail: tint plus glyph carry the state, the active row
 * shimmers, and failures surface their reason. One shared visual language for
 * the pending card, the detail popover, and the import dialog.
 */
export function ResumeParserTimeline({
	className,
	density = "comfortable",
	emptyLabel = "Esperando primeras trazas del parser…",
	events,
}: ResumeParserTimelineProps): React.ReactElement {
	if (events.length === 0) {
		return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
	}

	return (
		<ol aria-live="polite" className={cn("flex flex-col", className)}>
			{events.map((event, index) => (
				<TimelineRow
					density={density}
					event={event}
					isLast={index === events.length - 1}
					key={`${event.at ?? index}-${event.kind}-${event.status}-${event.title ?? event.toolName ?? ""}`}
				/>
			))}
		</ol>
	);
}

function TimelineRow({
	density,
	event,
	isLast,
}: {
	density: TimelineDensity;
	event: ResumeParserEvent;
	isLast: boolean;
}): React.ReactElement {
	const state = STATE_BY_STATUS[event.status];
	const title = event.title ?? event.toolName ?? KIND_LABEL[event.kind] ?? "Procesando";
	const detailRaw = state === "failed" ? (event.reason ?? event.detail) : event.detail;
	const detail = detailRaw && detailRaw !== title ? detailRaw : null;
	const textSize = density === "compact" ? "text-xs" : "text-sm";

	let Icon = ICON_BY_KIND[event.kind] ?? WrenchIcon;
	if (state === "failed") {
		Icon = XIcon;
	} else if (event.mock) {
		Icon = SparklesIcon;
	}

	return (
		<li className="fade-in-0 flex animate-in gap-3 duration-300">
			<div className="flex flex-col items-center">
				<span
					className={cn(
						"relative flex shrink-0 items-center justify-center rounded-full border",
						NODE_SIZE[density],
						NODE_CLASS[state]
					)}
				>
					{state === "running" && (
						<span
							aria-hidden="true"
							className="absolute inset-0 animate-ping rounded-full bg-info/25 motion-reduce:hidden"
						/>
					)}
					<Icon className={cn("relative", ICON_SIZE[density])} />
				</span>
				{!isLast && <span aria-hidden="true" className="my-1 w-px flex-1 bg-border" />}
			</div>

			<div className={cn("min-w-0 flex-1", !isLast && ROW_GAP[density])}>
				{state === "running" ? (
					<Shimmer as="p" className={cn("truncate", textSize)} spread={1}>
						{title}
					</Shimmer>
				) : (
					<p className={cn("truncate", textSize, TITLE_CLASS[state])}>{title}</p>
				)}

				{detail && <p className={cn("truncate text-muted-foreground", textSize)}>{detail}</p>}
			</div>
		</li>
	);
}
