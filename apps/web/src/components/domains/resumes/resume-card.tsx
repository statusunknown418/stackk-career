import { ArrowRightIcon, SparkleIcon, StarIcon } from "@phosphor-icons/react";
import type { ResumeListItem } from "@stackk-career/schemas/api/resumes";
import type { ResumeStatus } from "@stackk-career/schemas/db/resumes";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Accent bar colour for the faux CV sheet, mirroring the status badge tone. */
const STATUS_ACCENT: Record<ResumeStatus, string> = {
	draft: "bg-warning/60",
	ready: "bg-success/60",
	archived: "bg-muted-foreground/30",
};

/** CV-sheet preview rendering the holder's name and target so the card reads like a real document. */
function ResumeSheetPreview({ name, subtitle, status }: { name: string; subtitle: string; status: ResumeStatus }) {
	return (
		<div
			aria-hidden="true"
			className="relative aspect-video overflow-hidden rounded-xl border bg-linear-to-br from-muted"
		>
			<div className="absolute inset-x-5 top-4 flex flex-col gap-1.5 rounded-t-lg bg-background p-4 shadow-sm">
				<p className="truncate text-foreground text-sm leading-none">{name}</p>

				{subtitle ? (
					<p className="truncate text-muted-foreground text-xs leading-none">{subtitle}</p>
				) : (
					<div className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
				)}

				<div className={cn("mt-2 h-1 w-8 rounded-full", STATUS_ACCENT[status])} />

				<div className="mt-1 flex flex-col gap-1.5">
					<div className="h-1.5 w-full rounded-full bg-foreground/8" />
					<div className="h-1.5 w-11/12 rounded-full bg-foreground/8" />
					<div className="h-1.5 w-4/5 rounded-full bg-foreground/8" />
				</div>
			</div>
		</div>
	);
}

export function ResumeCard({ resume }: { resume: ResumeListItem }) {
	const updatedLabel = formatDistanceToNow(resume.updatedAt, { addSuffix: true, locale: es });
	const agentCreated = resume.aiMetadata?.agentCreated ?? false;
	const candidateName =
		[resume.contact?.firstName, resume.contact?.lastName]
			.map((part) => part?.trim())
			.filter(Boolean)
			.join(" ") || resume.title;
	const subtitle = [resume.targetRole, resume.targetedCompanyIdentifier]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" · ");

	return (
		<Link className="block h-full" params={{ resumeId: resume.id }} to="/dash/resumes/$resumeId">
			<Frame
				aria-labelledby={`resume-${resume.id}-title`}
				className="group h-full gap-3 p-3 transition-colors hover:bg-muted"
			>
				<ResumeSheetPreview name={candidateName} status={resume.status} subtitle={subtitle} />

				<div className="flex items-center justify-between gap-2">
					<ul aria-label="Etiquetas del CV" className="flex list-none items-center gap-1">
						{resume.isPrimary && (
							<li>
								<Badge size="sm" variant="info">
									<StarIcon weight="fill" />
									Principal
								</Badge>
							</li>
						)}

						{agentCreated && (
							<li>
								<Badge size="sm" variant="secondary">
									<SparkleIcon weight="fill" />
									IA
								</Badge>
							</li>
						)}
					</ul>
				</div>

				<FrameTitle
					className="min-w-0 truncate text-base underline-offset-4 group-hover:underline"
					id={`resume-${resume.id}-title`}
				>
					{resume.title}
				</FrameTitle>

				<div className="flex flex-col gap-2">
					<time className="text-muted-foreground text-xs" dateTime={formatISO(resume.updatedAt)}>
						Actualizado {updatedLabel}
					</time>

					<span aria-hidden="true" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-between")}>
						Editar CV
						<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" weight="bold" />
					</span>
				</div>
			</Frame>
		</Link>
	);
}

export function ResumeCardSkeleton() {
	return (
		<Frame aria-hidden="true" className="h-full gap-3 p-3">
			<Skeleton className="aspect-[4/3] w-full rounded-xl" />

			<div className="flex items-center justify-between gap-2">
				<Skeleton className="h-5 w-20 rounded-sm" />
				<Skeleton className="h-5 w-14 rounded-sm" />
			</div>

			<div className="flex flex-1 flex-col gap-1.5">
				<Skeleton className="h-5 w-40 rounded-md" />
				<Skeleton className="h-4 w-28 rounded-md" />
			</div>

			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-24 rounded-md" />
				<Skeleton className="h-8 w-full rounded-lg" />
			</div>
		</Frame>
	);
}
