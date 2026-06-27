"use client";

import { PencilSimpleIcon, ReadCvLogoIcon, TargetIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";

interface LettersJobContextSheetProps {
	jobContextSource: "manual" | "resume-job-target";
	jobPosition: string;
	jobSummary: string | null;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	resumeTitle: string | null;
}

const COPY = {
	targetSource: "Oferta guardada",
	manualSource: "Contexto manual",
	targetDescription:
		"La oferta normalizada que CASEY usó como referencia para alinear tu carta. Es la versión guardada al crear la carta: si luego cambias la oferta del CV, esta no se altera.",
	manualDescription:
		"El contexto del puesto que escribiste al crear la carta. CASEY lo usó como referencia para redactarla.",
	manualBodyLabel: "Descripción del puesto",
	empty: "No se guardaron detalles del puesto para esta carta.",
} as const;

/** A parsed slice of the stored job snapshot, relabeled for the Spanish UI. */
type Section =
	| { kind: "text"; label: string; value: string }
	| { kind: "list"; label: string; items: string[] }
	| { kind: "chips"; label: string; items: string[] };

/**
 * `formatJobTargetContext` emits English-prefixed lines (`Summary:`, `Responsibilities: a; b`).
 * Map the known prefixes to Spanish labels + a render shape; unknown prefixes fall back to plain
 * text so a formatter change degrades gracefully instead of dropping data.
 */
const TARGET_FIELDS: Record<string, { kind: Section["kind"]; label: string }> = {
	Seniority: { kind: "text", label: "Nivel" },
	Location: { kind: "text", label: "Ubicación" },
	"Employment type": { kind: "text", label: "Tipo de empleo" },
	Summary: { kind: "text", label: "Resumen" },
	Responsibilities: { kind: "list", label: "Responsabilidades" },
	Qualifications: { kind: "list", label: "Requisitos" },
	"Skills sought": { kind: "chips", label: "Habilidades buscadas" },
	"ATS keywords": { kind: "chips", label: "Palabras clave (ATS)" },
};

/** Turn one snapshot line into a section, or null to drop it (role is already the sheet title). */
function lineToSection(line: string): Section | null {
	const separatorIndex = line.indexOf(": ");
	const prefix = separatorIndex > 0 ? line.slice(0, separatorIndex) : "";
	if (prefix === "Role") {
		return null;
	}
	const value = separatorIndex > 0 ? line.slice(separatorIndex + 2).trim() : line;
	if (!value) {
		return null;
	}
	const config = TARGET_FIELDS[prefix];
	if (!config) {
		return { kind: "text", label: "", value };
	}
	if (config.kind === "list") {
		return {
			kind: "list",
			label: config.label,
			items: value
				.split("; ")
				.map((p) => p.trim())
				.filter(Boolean),
		};
	}
	if (config.kind === "chips") {
		return {
			kind: "chips",
			label: config.label,
			items: value
				.split(", ")
				.map((p) => p.trim())
				.filter(Boolean),
		};
	}
	return { kind: "text", label: config.label, value };
}

function parseTargetSummary(summary: string): Section[] {
	const sections: Section[] = [];
	for (const raw of summary.split("\n")) {
		const line = raw.trim();
		if (!line) {
			continue;
		}
		const section = lineToSection(line);
		if (section) {
			sections.push(section);
		}
	}
	return sections;
}

function SectionLabel({ children }: { children: string }) {
	return <span className="font-medium text-muted-foreground text-xs">{children}</span>;
}

function SectionView({ section }: { section: Section }) {
	if (section.kind === "chips") {
		return (
			<div className="flex flex-col gap-2">
				<SectionLabel>{section.label}</SectionLabel>
				<ul className="flex list-none flex-wrap gap-1.5">
					{section.items.map((item) => (
						<li className="flex" key={item}>
							<Badge size="sm" variant="outline">
								{item}
							</Badge>
						</li>
					))}
				</ul>
			</div>
		);
	}

	if (section.kind === "list") {
		return (
			<div className="flex flex-col gap-2">
				<SectionLabel>{section.label}</SectionLabel>
				<ul className="flex list-none flex-col gap-1.5">
					{section.items.map((item) => (
						<li className="flex gap-2 text-foreground text-sm leading-relaxed" key={item}>
							<span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
							<span className="min-w-0">{item}</span>
						</li>
					))}
				</ul>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{section.label && <SectionLabel>{section.label}</SectionLabel>}
			<p className="whitespace-pre-line text-foreground text-sm leading-relaxed">{section.value}</p>
		</div>
	);
}

function JobContextBody({
	jobContextSource,
	jobSummary,
}: {
	jobContextSource: LettersJobContextSheetProps["jobContextSource"];
	jobSummary: string | null;
}) {
	const summary = jobSummary?.trim();
	if (!summary) {
		return <p className="text-muted-foreground text-sm">{COPY.empty}</p>;
	}

	if (jobContextSource === "resume-job-target") {
		const sections = parseTargetSummary(summary);
		if (sections.length === 0) {
			return <p className="whitespace-pre-line text-foreground text-sm leading-relaxed">{summary}</p>;
		}
		return (
			<div className="flex flex-col gap-5">
				{sections.map((section) => (
					<SectionView
						key={`${section.label}:${section.kind === "text" ? section.value : section.items.join(",")}`}
						section={section}
					/>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<SectionLabel>{COPY.manualBodyLabel}</SectionLabel>
			<p className="whitespace-pre-line text-foreground text-sm leading-relaxed">{summary}</p>
		</div>
	);
}

/**
 * Slide-over showing the job posting a cover letter is aligned to. Renders the snapshot stored on
 * the generation (`title` + `summary`) so historical letters stay accurate even if the resume's
 * job target later changes.
 */
export function LettersJobContextSheet({
	jobContextSource,
	jobPosition,
	jobSummary,
	onOpenChange,
	open,
	resumeTitle,
}: LettersJobContextSheetProps) {
	const isTargetJob = jobContextSource === "resume-job-target";

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetPopup className="sm:max-w-xl" side="right">
				<SheetHeader className="gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<Badge size="sm" variant={isTargetJob ? "info" : "secondary"}>
							{isTargetJob ? <TargetIcon weight="duotone" /> : <PencilSimpleIcon weight="duotone" />}
							{isTargetJob ? COPY.targetSource : COPY.manualSource}
						</Badge>
						{resumeTitle && (
							<Badge className="min-w-0" size="sm" variant="outline">
								<ReadCvLogoIcon weight="fill" />
								<span className="min-w-0 truncate">{resumeTitle}</span>
							</Badge>
						)}
					</div>
					<SheetTitle>{jobPosition}</SheetTitle>
					<SheetDescription>{isTargetJob ? COPY.targetDescription : COPY.manualDescription}</SheetDescription>
				</SheetHeader>

				<SheetPanel>
					<JobContextBody jobContextSource={jobContextSource} jobSummary={jobSummary} />
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}
