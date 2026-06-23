import { ArrowSquareOutIcon, CaretDownIcon, TargetIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { orpc } from "@/utils/orpc";

type JobTargetData = AppRouterOutputs["resumes"]["getJobTarget"] | undefined;

function ResumeJobTargetChips({ label, items }: { label: string; items: string[] | undefined }) {
	if (!items || items.length === 0) {
		return null;
	}
	return (
		<section className="flex flex-col gap-1.5">
			<p className="text-foreground text-xs">{label}</p>
			<ul className="flex flex-wrap gap-1.5">
				{items.map((item) => (
					<li key={item}>
						<Badge size="sm" variant="outline">
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
			<p className="text-foreground text-xs">{label}</p>
			<ul className="list-disc space-y-1 pl-4">
				{items.map((item) => (
					<li key={item}>{item}</li>
				))}
			</ul>
		</section>
	);
}

function ResumeJobTargetNote({ jobTarget }: { jobTarget: JobTargetData }) {
	if (!jobTarget || jobTarget.status === "failed") {
		return null;
	}

	if (jobTarget.status !== "ready" || !jobTarget.title) {
		return (
			<div className="flex items-center gap-2.5 rounded-lg border bg-card p-3 text-muted-foreground text-sm">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
					<TargetIcon className="size-4 animate-pulse" weight="duotone" />
				</span>
				<p className="leading-snug">Buscando los detalles del puesto para personalizar las sugerencias…</p>
			</div>
		);
	}

	const meta = [jobTarget.location, jobTarget.seniority, jobTarget.employmentType].filter((value): value is string =>
		Boolean(value)
	);
	const { structured } = jobTarget;

	return (
		<Collapsible className="rounded-lg border bg-card text-sm">
			<CollapsibleTrigger className="group flex w-full items-center gap-2.5 p-3 text-left">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success-foreground">
					<TargetIcon className="size-4" weight="duotone" />
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-muted-foreground text-xs">Adaptado al puesto</span>
					<span className="text-foreground leading-snug">
						{jobTarget.title}
						{jobTarget.company ? <span className="text-muted-foreground"> · {jobTarget.company}</span> : null}
					</span>
				</span>
				<CaretDownIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="flex flex-col gap-3 border-border/60 border-t px-3 pt-3 pb-3 text-muted-foreground">
					<a
						className="inline-flex w-fit items-center gap-1.5 text-foreground underline-offset-2 hover:underline"
						href={jobTarget.sourceUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<ArrowSquareOutIcon className="size-3.5 shrink-0" />
						Ver oferta en LinkedIn
					</a>
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

	return <ResumeJobTargetNote jobTarget={jobTarget.data} />;
}
