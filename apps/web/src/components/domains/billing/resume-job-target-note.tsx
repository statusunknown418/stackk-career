import { ArrowSquareOutIcon, CaretDownIcon, TargetIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DotmSquare6 } from "@/components/ui/dotm-square-6";
import { orpc } from "@/utils/orpc";
import { ResumeJobTargetChangeDialog } from "../resume-editor/resume-job-target-change-dialog";

type JobTargetData = AppRouterOutputs["resumes"]["getJobTarget"] | undefined;

function ResumeJobTargetChips({ label, items }: { label: string; items: string[] | undefined }) {
	if (!items || items.length === 0) {
		return null;
	}
	return (
		<section className="flex flex-col gap-1.5">
			<p className="text-foreground text-sm">{label}</p>
			<ul className="flex flex-wrap gap-1.5">
				{items.map((item) => (
					<li key={item}>
						<Badge className="font-normal text-muted-foreground" variant="outline">
							{item}
						</Badge>
					</li>
				))}
			</ul>
		</section>
	);
}

function ResumeJobTargetList({ label, items }: { label: string; items: string[] | undefined }) {
	if (!items || items.length === 0) {
		return null;
	}
	return (
		<section className="flex flex-col gap-1.5">
			<p className="text-foreground text-sm">{label}</p>
			<ul className="list-disc space-y-1 pl-4">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</section>
	);
}

function ResumeJobTargetNote({ jobTarget, resumeId }: { jobTarget: JobTargetData; resumeId: string }) {
	if (!jobTarget) {
		return (
			<div className="flex flex-col gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm">
				<div className="mb-2 flex gap-2.5 text-muted-foreground">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<TargetIcon className="size-4" weight="duotone" />
					</span>
					<p>Personaliza tu CV a una oferta laboral real y Casey te ayudará!</p>
				</div>
				<ResumeJobTargetChangeDialog mode="add" resumeId={resumeId} />
			</div>
		);
	}

	if (jobTarget.status === "failed") {
		return (
			<div className="flex flex-col gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm">
				<div className="flex gap-2.5 text-muted-foreground">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive-foreground">
						<WarningCircleIcon className="size-4" weight="duotone" />
					</span>
					<p className="leading-snug">No pudimos leer esa oferta. Prueba con otro enlace de LinkedIn.</p>
				</div>
				<ResumeJobTargetChangeDialog currentTitle={jobTarget.title} resumeId={resumeId} />
			</div>
		);
	}

	if (jobTarget.status !== "ready" || !jobTarget.title) {
		return (
			<div className="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
				<div className="flex gap-2.5 text-muted-foreground">
					<DotmSquare6 className="shrink-0" dotSize={3} size={24} />
					<Shimmer>Buscando detalles del puesto…</Shimmer>
				</div>
				<p className="text-muted-foreground text-xs">Podrás crear la carta cuando terminemos de leer la oferta.</p>
			</div>
		);
	}

	const meta = [jobTarget.location, jobTarget.seniority, jobTarget.employmentType].filter((value): value is string =>
		Boolean(value)
	);
	const { structured } = jobTarget;

	return (
		<Collapsible className="rounded-lg border bg-card text-sm">
			<CollapsibleTrigger className="group flex w-full gap-2.5 px-3 py-2 text-left">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success-foreground">
					<TargetIcon className="size-4" weight="duotone" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-muted-foreground text-xs">Adaptado al puesto</span>
					<span className="text-foreground leading-snug">
						{jobTarget.title}
						{jobTarget.company ? <span className="text-muted-foreground"> @ {jobTarget.company}</span> : null}
					</span>
				</span>
				<CaretDownIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border/60 border-t px-3 py-2.5">
				<ResumeJobTargetChangeDialog currentTitle={jobTarget.title} resumeId={resumeId} />
				<a
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
					href={jobTarget.sourceUrl}
					rel="noopener noreferrer"
					target="_blank"
				>
					<ArrowSquareOutIcon className="size-3.5 shrink-0" />
					Ver oferta en LinkedIn
				</a>
			</div>

			<CollapsibleContent>
				<div className="flex flex-col gap-3 border-border/60 border-t px-3 pt-3 pb-3 text-muted-foreground">
					{meta.length > 0 && (
						<ul className="flex flex-wrap gap-1.5">
							{meta.map((value) => (
								<li key={value}>
									<Badge size="sm" variant="secondary">
										{value}
									</Badge>
								</li>
							))}
						</ul>
					)}
					{structured?.summary && <p>{structured.summary}</p>}
					<ResumeJobTargetChips items={structured?.skills} label="Habilidades clave" />
					<ResumeJobTargetChips items={structured?.keywords} label="Palabras clave (ATS)" />
					<ResumeJobTargetList items={structured?.responsibilities} label="Responsabilidades" />
					<ResumeJobTargetList items={structured?.qualifications} label="Requisitos" />
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Fetches the resume's LinkedIn job target and renders the "Adaptado al puesto"
 * note. Renders nothing when the resume has no job target attached. Owns its own
 * query so it can be mounted independently of the analysis panel.
 */
export function ResumeJobTargetPanel({ resumeId }: { resumeId: string }) {
	const jobTarget = useQuery(
		orpc.resumes.getJobTarget.queryOptions({
			input: { resumeId },
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				return status === "pending" || status === "fetching" ? 4000 : false;
			},
		})
	);

	return <ResumeJobTargetNote jobTarget={jobTarget.data} resumeId={resumeId} />;
}
