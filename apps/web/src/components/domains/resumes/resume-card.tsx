import { ArrowUpRightIcon, BuildingsIcon, SparkleIcon, StarIcon, UserIcon } from "@phosphor-icons/react";
import type { ResumeListItem } from "@stackk-career/schemas/api/resumes";
import type { ResumeStatus } from "@stackk-career/schemas/db/resumes";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

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

				<Link
					className="flex items-start justify-between gap-3 underline-offset-2 transition-all group-hover:underline"
					params={{ resumeId: resume.id }}
					to="/dash/resumes/$resumeId"
				>
					<FrameTitle id={`resume-${resume.id}-title`}>{resume.displayName}</FrameTitle>

					<ArrowUpRightIcon
						aria-hidden="true"
						className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
						weight="bold"
					/>
				</Link>

				<FrameDescription>{resume.title}</FrameDescription>
			</FrameHeader>

			<FramePanel className="grid grid-cols-2 gap-3 text-sm">
				<div className="flex min-w-0 flex-col gap-1">
					<dt className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
						<UserIcon aria-hidden="true" className="size-3.5" />
						Titular
					</dt>
					<dd className="truncate">
						{ownerName ? (
							<address className="not-italic">{ownerName}</address>
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
	);
}
