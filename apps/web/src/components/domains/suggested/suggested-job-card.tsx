import {
	ArrowSquareOutIcon,
	BuildingOfficeIcon,
	CalendarBlankIcon,
	ChatCircleTextIcon,
	CheckIcon,
	GraduationCapIcon,
	type Icon,
	LinkedinLogoIcon,
	MapPinIcon,
	SuitcaseSimpleIcon,
	TargetIcon,
	XIcon,
} from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Frame, FrameTitle } from "@/components/ui/frame";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, firstMeaningful } from "@/lib/utils";

/** One `ready` suggestion as returned by the `suggestedJobs.list` procedure. */
type SuggestedJob = AppRouterOutputs["suggestedJobs"]["list"]["jobs"][number];

/** Show at most this many match reasons per card — the rest is noise on a feed card. */
const MAX_REASONS = 3;
const SOURCE_LABELS: Record<string, string> = { linkedin: "LinkedIn" };

/** One labeled fact shown in the card's detail list. */
interface Detail {
	icon: Icon;
	label: string;
	value: string | null;
}

/**
 * Color + words for the match meter, banded by score so the bar reads at a glance:
 * red ≤20 · orange ≤40 · yellow ≤60 · teal ≤80 · green ≤100. `indicator` fills the
 * bar; `accent` tints the icon + value; `label` is the plain-language equivalent so
 * the number is understandable without decoding a percentage.
 */
interface MatchBand {
	accent: string;
	indicator: string;
}

function matchBand(score: number): MatchBand {
	if (score <= 20) {
		return { indicator: "bg-red-500", accent: "text-red-600 dark:text-red-400" };
	}
	if (score <= 40) {
		return { indicator: "bg-orange-500", accent: "text-orange-600 dark:text-orange-400" };
	}
	if (score <= 60) {
		return { indicator: "bg-yellow-500", accent: "text-yellow-700 dark:text-yellow-400" };
	}
	if (score <= 80) {
		return { indicator: "bg-teal-500", accent: "text-teal-600 dark:text-teal-400" };
	}
	return { indicator: "bg-green-500", accent: "text-green-600 dark:text-green-400" };
}

function SourceBadge({ source }: { source: string }) {
	return (
		<Badge size="sm" variant="secondary">
			{source === "linkedin" ? <LinkedinLogoIcon weight="fill" /> : null}
			{SOURCE_LABELS[source] ?? source}
		</Badge>
	);
}

export function SuggestedJobCard({
	job,
	onDismiss,
	isDismissing,
}: {
	job: SuggestedJob;
	onDismiss: (id: string) => void;
	isDismissing: boolean;
}) {
	const title = firstMeaningful([job.title]) ?? "Vacante";
	const reasons = (job.matchReasons ?? []).slice(0, MAX_REASONS);
	const band = matchBand(job.matchScore);

	// Labeled so "Full-time" / "Senior" read as what they are, not as opaque chips.
	const details: Detail[] = [
		{ icon: BuildingOfficeIcon, label: "Empresa", value: job.company },
		{ icon: MapPinIcon, label: "Ubicación", value: job.location },
		{ icon: SuitcaseSimpleIcon, label: "Tipo de empleo", value: job.employmentType },
		{ icon: GraduationCapIcon, label: "Nivel", value: job.seniority },
	].filter((detail) => detail.value);

	return (
		<li className="flex min-w-0">
			<Frame aria-labelledby={`sjob-${job.id}-title`} className="group h-full w-full gap-3 p-3">
				<div className="flex items-start justify-between gap-2">
					<SourceBadge source={job.source} />

					<Button
						aria-label={`Descartar ${title}`}
						disabled={isDismissing}
						onClick={() => onDismiss(job.id)}
						size="icon-sm"
						variant="ghost-muted"
					>
						<XIcon />
					</Button>
				</div>

				<FrameTitle className="min-w-0 text-base" id={`sjob-${job.id}-title`}>
					{title}
				</FrameTitle>

				{details.length > 0 && (
					<dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
						{details.map(({ icon: DetailIcon, label, value }) => (
							<Fragment key={label}>
								<dt className="flex items-center gap-1.5 text-muted-foreground">
									<DetailIcon className="shrink-0" />
									{label}
								</dt>
								<dd className="min-w-0 truncate text-foreground">{value}</dd>
							</Fragment>
						))}
					</dl>
				)}

				<Meter className="gap-1.5" max={100} min={0} value={job.matchScore}>
					<div className="flex items-center justify-between">
						<MeterLabel className="inline-flex items-center gap-1.5 font-normal text-muted-foreground text-xs">
							<TargetIcon className={band.accent} />
							Coincidencia
						</MeterLabel>
						<MeterValue className={cn("text-xs tabular-nums", band.accent)}>
							{(_formatted, value) => `${value}%`}
						</MeterValue>
					</div>

					<MeterTrack className="rounded-lg">
						<MeterIndicator className={band.indicator} />
					</MeterTrack>
				</Meter>

				{reasons.length > 0 && (
					<ul className="flex list-none flex-col gap-1">
						{reasons.map((reason) => (
							<li className="flex items-start gap-1.5 text-muted-foreground text-xs" key={reason}>
								<CheckIcon className="mt-0.5 shrink-0 text-oxblood" />
								<span className="min-w-0">{reason}</span>
							</li>
						))}
					</ul>
				)}

				{job.postedAt && (
					<time className="flex items-center gap-1.5 text-muted-foreground text-xs" dateTime={formatISO(job.postedAt)}>
						<CalendarBlankIcon className="shrink-0" />
						Publicada {formatDistanceToNow(job.postedAt, { addSuffix: true, locale: es })}
					</time>
				)}

				<div className="mt-auto flex flex-col gap-2 pt-1">
					<a
						className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "w-full justify-between")}
						href={job.url}
						rel="noopener noreferrer"
						target="_blank"
					>
						Ver oferta
						<ArrowSquareOutIcon />
					</a>

					<Link
						className={cn(buttonVariants({ size: "sm", variant: "ghost-muted" }), "w-full justify-between")}
						to="/dash/letters"
					>
						Adaptar carta
						<ChatCircleTextIcon />
					</Link>
				</div>
			</Frame>
		</li>
	);
}

export function SuggestedJobCardSkeleton() {
	return (
		<li aria-hidden="true" className="flex min-w-0">
			<Frame className="h-full w-full gap-3 p-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-20 rounded-md" />
					<Skeleton className="size-7 rounded-md" />
				</div>

				<Skeleton className="h-5 w-48 rounded-md" />

				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-3.5 w-40 rounded" />
					<Skeleton className="h-3.5 w-36 rounded" />
					<Skeleton className="h-3.5 w-32 rounded" />
				</div>

				<Skeleton className="h-2 w-full rounded-lg" />

				<div className="mt-auto flex flex-col gap-2 pt-1">
					<Skeleton className="h-8 w-full rounded-lg" />
					<Skeleton className="h-8 w-full rounded-lg" />
				</div>
			</Frame>
		</li>
	);
}
