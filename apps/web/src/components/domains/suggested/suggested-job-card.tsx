import {
	ArrowSquareOutIcon,
	CalendarBlankIcon,
	ChatCircleTextIcon,
	CheckIcon,
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
	const subtitle = [job.company, job.location].filter(Boolean).join(" · ");
	const reasons = (job.matchReasons ?? []).slice(0, MAX_REASONS);

	return (
		<li className="flex min-w-0">
			<Frame aria-labelledby={`sjob-${job.id}-title`} className="group h-full w-full gap-3 p-3">
				<div className="flex items-start justify-between gap-2">
					<ul aria-label="Etiquetas de la vacante" className="flex min-w-0 list-none flex-wrap items-center gap-1">
						<li className="flex min-w-0">
							<SourceBadge source={job.source} />
						</li>

						{job.employmentType && (
							<li className="flex min-w-0">
								<Badge className="min-w-0 shrink" size="sm" variant="outline">
									<SuitcaseSimpleIcon />
									<span className="min-w-0 truncate">{job.employmentType}</span>
								</Badge>
							</li>
						)}

						{job.seniority && (
							<li className="flex min-w-0">
								<Badge className="min-w-0 shrink" size="sm" variant="outline">
									<span className="min-w-0 truncate">{job.seniority}</span>
								</Badge>
							</li>
						)}
					</ul>

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

				{subtitle && (
					<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
						<MapPinIcon className="shrink-0" />
						<span className="min-w-0 truncate">{subtitle}</span>
					</p>
				)}

				<Meter className="gap-1.5" max={100} min={0} value={job.matchScore}>
					<div className="flex items-center justify-between">
						<MeterLabel className="inline-flex items-center gap-1.5 font-normal text-muted-foreground text-xs">
							<TargetIcon className="text-oxblood" />
							Coincidencia
						</MeterLabel>
						<MeterValue className="text-xs">{(_formatted, value) => `${value}%`}</MeterValue>
					</div>

					<MeterTrack className="rounded-lg">
						<MeterIndicator className="bg-oxblood" />
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
				<div className="flex items-center gap-1">
					<Skeleton className="h-5 w-20 rounded-md" />
					<Skeleton className="h-5 w-16 rounded-md" />
				</div>

				<Skeleton className="h-5 w-48 rounded-md" />
				<Skeleton className="h-4 w-36 rounded-md" />
				<Skeleton className="h-2 w-full rounded-lg" />

				<div className="flex flex-col gap-2 pt-2">
					<Skeleton className="h-8 w-full rounded-lg" />
					<Skeleton className="h-8 w-full rounded-lg" />
				</div>
			</Frame>
		</li>
	);
}
