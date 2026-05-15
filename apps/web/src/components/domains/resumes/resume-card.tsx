import { ArrowUpRightIcon, BuildingsIcon, SparkleIcon, StarIcon, UserIcon } from "@phosphor-icons/react";
import type { ResumeListItem } from "@stackk-career/schemas/api/resumes";
import type { ResumeStatus } from "@stackk-career/schemas/db/resumes";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<ResumeStatus, string> = {
	draft: "Borrador",
	ready: "Listo",
	archived: "Archivado",
};

const STATUS_VARIANT: Record<ResumeStatus, "warning" | "success" | "outline"> = {
	draft: "warning",
	ready: "success",
	archived: "outline",
};

const EMPTY = "—";

export function ResumeCard({ resume }: { resume: ResumeListItem }) {
	const ownerName = resume.contact ? `${resume.contact.firstName} ${resume.contact.lastName}`.trim() : null;
	const updatedLabel = formatDistanceToNow(resume.updatedAt, { addSuffix: true, locale: es });
	const score = resume.aiMetadata?.agentScore;
	const agentCreated = resume.aiMetadata?.agentCreated ?? false;

	return (
		<Link params={{ resumeId: resume.id }} to="/dash/resumes/$resumeId">
			<Frame aria-labelledby={`resume-${resume.id}-title`} className="group">
				<FrameHeader>
					<ul aria-label="Estado del CV" className="flex list-none items-center gap-2">
						<Badge size="sm" variant={STATUS_VARIANT[resume.status]}>
							{STATUS_LABEL[resume.status]}
						</Badge>

						{resume.isPrimary && (
							<Badge size="sm" variant="info">
								<StarIcon weight="fill" />
								Principal
							</Badge>
						)}

						{agentCreated && (
							<Badge size="sm" variant="secondary">
								<SparkleIcon weight="fill" />
								IA
							</Badge>
						)}
					</ul>

					<section className="flex items-center gap-2 underline-offset-4 group-hover:underline">
						<FrameTitle id={`resume-${resume.id}-title`}>{resume.title}</FrameTitle>

						<ArrowUpRightIcon
							aria-hidden="true"
							className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
							weight="bold"
						/>
					</section>
				</FrameHeader>

				<FramePanel className="grid grid-cols-2 gap-3 text-sm">
					<div className="flex min-w-0 flex-col gap-1">
						<dt className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
							<UserIcon aria-hidden="true" className="size-3.5" />
							Nombre
						</dt>

						<dd className="truncate">
							{ownerName ? (
								<p className="not-italic">{ownerName}</p>
							) : (
								<span className="text-muted-foreground">{EMPTY}</span>
							)}
						</dd>
					</div>

					<div className="flex min-w-0 flex-col gap-1">
						<dt className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
							<BuildingsIcon aria-hidden="true" className="size-3.5" />
							Empresa
						</dt>
						<dd className="truncate">
							{resume.targetedCompanyIdentifier ?? <span className="text-muted-foreground">{EMPTY}</span>}
						</dd>
					</div>
				</FramePanel>

				<FrameFooter className="flex items-center justify-between gap-2 text-muted-foreground text-xs">
					<time dateTime={formatISO(resume.updatedAt)}>Actualizado {updatedLabel}</time>
					{typeof score === "number" && (
						<span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground tabular-nums">
							{score}/100
						</span>
					)}
				</FrameFooter>
			</Frame>
		</Link>
	);
}

export function ResumeCardSkeleton() {
	return (
		<Frame aria-hidden="true">
			<FrameHeader>
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-20 rounded-full" />
					<Skeleton className="h-5 w-14 rounded-full" />
				</div>

				<div className="flex items-start justify-between gap-3">
					<Skeleton className="h-6 w-40 rounded-md" />
					<Skeleton className="size-4 rounded-sm" />
				</div>

				<Skeleton className="h-4 w-3/4 rounded-md" />
			</FrameHeader>

			<FramePanel className="grid grid-cols-2 gap-3 text-sm">
				<div className="flex min-w-0 flex-col gap-1">
					<Skeleton className="h-3 w-16 rounded-md" />
					<Skeleton className="h-4 w-24 rounded-md" />
				</div>

				<div className="flex min-w-0 flex-col gap-1">
					<Skeleton className="h-3 w-16 rounded-md" />
					<Skeleton className="h-4 w-28 rounded-md" />
				</div>
			</FramePanel>

			<FrameFooter className="flex items-center justify-between gap-2">
				<Skeleton className="h-4 w-28 rounded-md" />
				<Skeleton className="h-6 w-14 rounded-full" />
			</FrameFooter>
		</Frame>
	);
}
