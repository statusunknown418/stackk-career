"use client";

import {
	AddressBookIcon,
	ArrowCircleLeftIcon,
	ArrowCircleRightIcon,
	BriefcaseIcon,
	CalendarIcon,
	CaretDownIcon,
	ChatCircleTextIcon,
	CheckIcon,
	ExportIcon,
	FilesIcon,
	GraduationCapIcon,
	type Icon,
	ListChecksIcon,
	PlusIcon,
	SidebarSimpleIcon,
	SparkleIcon,
	SquaresFourIcon,
	TargetIcon,
	TextAlignLeftIcon,
	TrashSimpleIcon,
	WrenchIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Gauge } from "@/components/gauge";
import { cn } from "@/lib/utils";

/**
 * Faithful, static reproduction of the real resume editor (`/dash/resumes/$id`).
 * It mirrors the shipped app 1:1 — the inset app frame (collapsed icon rail →
 * bordered inset panel → top nav → editor header → three panes), the dark
 * `bg-card` CV document (never a cream sheet), the `bg-oxblood/10` active section
 * rail, and the analysis panel's `Gauge` + score breakdown + one-click edits. It
 * reuses the app's own token vocabulary so it renders in the exact same theme.
 */

interface RailIcon {
	active?: boolean;
	icon: Icon;
	label: string;
}

/** Global app sidebar, collapsed to icons (matches `careerWorkspaceNavigation`). */
const APP_NAV: readonly RailIcon[] = [
	{ icon: FilesIcon, label: "Curriculums", active: true },
	{ icon: ChatCircleTextIcon, label: "Cartas" },
	{ icon: CalendarIcon, label: "Coaching" },
	{ icon: BriefcaseIcon, label: "Targets" },
] as const;

interface SectionItem {
	active?: boolean;
	icon: Icon;
	label: string;
}

/** Editor "Secciones" rail — same items + icons the real `SectionRail` renders. */
const SECTION_ITEMS: readonly SectionItem[] = [
	{ icon: SquaresFourIcon, label: "Todo", active: true },
	{ icon: AddressBookIcon, label: "Contacto" },
	{ icon: TextAlignLeftIcon, label: "Resumen" },
	{ icon: BriefcaseIcon, label: "Experiencia" },
	{ icon: GraduationCapIcon, label: "Educación" },
	{ icon: WrenchIcon, label: "Habilidades" },
] as const;

interface ScoreRow {
	label: string;
	value: number;
}

/** Mirrors the real `SCORE_ROWS` breakdown keys from the analysis panel. */
const SCORE_ROWS: readonly ScoreRow[] = [
	{ label: "Impacto", value: 88 },
	{ label: "Keywords", value: 74 },
	{ label: "Claridad", value: 91 },
	{ label: "Formato", value: 96 },
	{ label: "Longitud", value: 82 },
] as const;

interface Suggestion {
	body: string;
	category: string;
	delta: number;
	severity: string;
	title: string;
	tone: "info" | "success";
}

const SUGGESTIONS: readonly Suggestion[] = [
	{
		body: "Agrega un resultado numérico a tu rol actual: “reduje el churn 18%”.",
		category: "Impacto",
		delta: 4,
		severity: "Top win",
		title: "Cuantifica tu impacto",
		tone: "success",
	},
	{
		body: "Menciona “design systems” y “research” para alinear con la vacante.",
		category: "Keywords",
		delta: 3,
		severity: "Falta clave",
		title: "Suma keywords del puesto",
		tone: "info",
	},
] as const;

const CONTACT = ["valentina.rios@mail.com", "+52 55 1234 5678", "CDMX, México", "in/valentinarios"] as const;

const SKILLS = ["Diseño de producto", "Figma", "Research", "Design systems", "Liderazgo", "Prototyping"] as const;

interface ExperienceEntry {
	bullets: readonly string[];
	company: string;
	current?: boolean;
	period: string;
	role: string;
}

const EXPERIENCE: readonly ExperienceEntry[] = [
	{
		bullets: [
			"Lideré el rediseño del onboarding, subiendo la activación 18%.",
			"Definí el design system usado por 4 squads de producto.",
		],
		company: "Nubank",
		current: true,
		period: "2022 — Presente",
		role: "Senior Product Designer",
	},
	{
		bullets: ["Diseñé el flujo de checkout para 12M de usuarios activos."],
		company: "Rappi",
		period: "2019 — 2022",
		role: "Product Designer",
	},
] as const;

export function AssendiaEditorPreview({ className }: { className?: string }) {
	return (
		<div className={cn("relative", className)}>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -inset-x-10 -top-16 -z-10 h-64 rounded-full bg-oxblood/10 blur-3xl"
			/>
			<AppWindow className="hidden md:flex" />
			<MobileEditorPreview className="md:hidden" />
		</div>
	);
}

/** The whole app shell: icon rail + bordered inset panel, exactly like `DashLayout`. */
function AppWindow({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"w-full gap-1 rounded-xl bg-background p-1 shadow-2xl shadow-black/40 ring-1 ring-border",
				className
			)}
		>
			<IconRail />
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border bg-background">
				<TopNav />
				<EditorHeader />
				<EditorBody />
			</div>
		</div>
	);
}

/** Far-left global sidebar, collapsed to `variant="icon"`. */
function IconRail() {
	return (
		<nav className="flex w-12 shrink-0 flex-col items-center gap-1 py-2">
			<span className="mb-2 grid size-8 place-items-center rounded-md bg-oxblood/15 text-oxblood">A</span>
			{APP_NAV.map(({ icon: NavIcon, label, active }) => (
				<span
					className={cn(
						"grid size-8 place-items-center rounded-md text-foreground/50",
						active && "bg-oxblood/10 text-oxblood"
					)}
					key={label}
					title={label}
				>
					<NavIcon className="size-4" weight={active ? "fill" : "regular"} />
				</span>
			))}
			<span className="mt-auto grid size-7 place-items-center rounded-full bg-foreground/10 text-[10px] text-foreground/60">
				VR
			</span>
		</nav>
	);
}

/** Inset top bar: sidebar toggle + history arrows, then plan + avatar. */
function TopNav() {
	return (
		<div className="flex items-center gap-1 border-b px-2 py-1.5 text-foreground/50">
			<SidebarSimpleIcon className="size-4" weight="duotone" />
			<ArrowCircleLeftIcon className="size-4" />
			<ArrowCircleRightIcon className="size-4" />
			<span className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-foreground/70 text-xs">
				<SparkleIcon className="size-3.5" weight="fill" />
				Free
			</span>
			<span className="grid size-6 place-items-center rounded-full bg-foreground/10 text-[10px] text-foreground/60">
				VR
			</span>
		</div>
	);
}

/** Editor header: date + save status + title, and the action buttons. */
function EditorHeader() {
	return (
		<header className="flex items-center justify-between gap-4 border-b px-3 py-2.5">
			<div className="min-w-0">
				<div className="flex items-center gap-2 text-xs">
					<span className="text-muted-foreground">5 jul 2026, 14:32</span>
					<span className="inline-flex items-center gap-1 text-muted-foreground">
						<CheckIcon className="size-3" />
						Guardado
					</span>
				</div>
				<p className="mt-0.5 text-[15px] text-foreground">CV — Product Designer</p>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex items-center overflow-hidden rounded-lg border text-foreground/80 text-xs">
					<span className="inline-flex items-center gap-1 px-2.5 py-1.5">
						<PlusIcon className="size-3.5" />
						Nueva sección
					</span>
					<span className="h-4 w-px bg-border" />
					<span className="inline-flex items-center gap-1 px-2.5 py-1.5">
						<ExportIcon className="size-3.5" />
						Exportar
					</span>
				</div>
				<span className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-foreground/80 text-xs">
					<ChatCircleTextIcon className="size-3.5" />
					Carta
				</span>
				<span className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-destructive text-xs">
					<TrashSimpleIcon className="size-3.5" />
					Borrar
				</span>
			</div>
		</header>
	);
}

/** The three panes: sections rail · document · analysis. */
function EditorBody() {
	return (
		<div className="flex gap-2 px-3 pt-3 pb-3">
			<SectionsRail />
			<DocumentPaper />
			<AnalysisPanel />
		</div>
	);
}

function SectionsRail() {
	return (
		<aside className="hidden w-52 shrink-0 flex-col gap-2 md:flex">
			<div className="rounded-lg bg-card">
				<div className="flex items-center justify-between px-3 py-2 text-foreground/80 text-sm">
					Secciones
					<CaretDownIcon className="size-3.5 text-foreground/40" />
				</div>
				<ul className="flex flex-col gap-0.5 px-2 pb-2">
					{SECTION_ITEMS.map(({ icon: SectionIcon, label, active }) => (
						<li key={label}>
							<span
								className={cn(
									"flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground",
									active && "bg-oxblood/10 text-foreground [&>svg]:text-oxblood"
								)}
							>
								<SectionIcon className="size-4 shrink-0" />
								{label}
							</span>
						</li>
					))}
				</ul>
			</div>
			<JobTargetCard />
		</aside>
	);
}

function JobTargetCard() {
	return (
		<div className="rounded-lg border bg-card p-3">
			<div className="flex items-center justify-between text-foreground/80">
				<span className="inline-flex items-center gap-1.5 text-xs">
					<TargetIcon className="size-3.5 text-oxblood" />
					Adaptado al puesto
				</span>
				<CaretDownIcon className="size-3.5 text-foreground/40" />
			</div>
			<p className="mt-1.5 text-foreground/70 text-xs leading-snug">Product Designer · Figma</p>
			<div className="mt-2 flex flex-wrap gap-1">
				{["Design systems", "Research", "B2B"].map((tag) => (
					<span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] text-foreground/60" key={tag}>
						{tag}
					</span>
				))}
			</div>
		</div>
	);
}

/** The CV document — dark `bg-card` sheet, matching the real `ResumeDocument`. */
function DocumentPaper() {
	return (
		<article className="min-w-0 flex-1">
			<div className="mx-auto w-full max-w-2xl rounded-md bg-card p-6 shadow-inner shadow-muted ring-1 ring-border/40 sm:p-8">
				<header className="flex flex-col items-center gap-1.5 text-center">
					<h3 className="text-2xl text-foreground tracking-tight">Valentina Ríos</h3>
					<p className="text-muted-foreground text-sm">Product Designer</p>
					<p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
						{CONTACT.map((item, index) => (
							<span className="inline-flex items-center gap-2" key={item}>
								{index > 0 && <span className="text-foreground/20">·</span>}
								{item}
							</span>
						))}
					</p>
				</header>

				<DocSection title="Resumen">
					<p className="text-[13px] text-foreground/75 leading-relaxed">
						Diseñadora de producto con 7 años creando experiencias B2B y fintech.{" "}
						<span className="rounded bg-oxblood/10 px-1 text-foreground ring-1 ring-oxblood/25">
							Lideré rediseños que aumentaron la activación 18% y redujeron el churn.
						</span>{" "}
						Enfoque en design systems y research continuo.
					</p>
				</DocSection>

				<DocSection title="Experiencia">
					<div className="flex flex-col gap-3">
						{EXPERIENCE.map((entry) => (
							<DocEntry entry={entry} key={entry.company} />
						))}
					</div>
				</DocSection>

				<DocSection title="Habilidades">
					<div className="flex flex-wrap gap-1.5">
						{SKILLS.map((skill) => (
							<span className="rounded-full border px-2.5 py-0.5 text-[11px] text-foreground/70" key={skill}>
								{skill}
							</span>
						))}
					</div>
				</DocSection>
			</div>
		</article>
	);
}

function DocSection({ title, children }: { children: React.ReactNode; title: string }) {
	return (
		<section className="mt-5">
			<h4 className="text-[15px] text-foreground">{title}</h4>
			<div className="mt-1.5 mb-2.5 h-px w-full bg-border" />
			{children}
		</section>
	);
}

function DocEntry({ entry }: { entry: ExperienceEntry }) {
	return (
		<div>
			<div className="flex items-baseline justify-between gap-3">
				<p className="text-[13px] text-foreground">
					{entry.role} · {entry.company}
				</p>
				<span className={cn("shrink-0 text-[11px]", entry.current ? "text-oxblood" : "text-muted-foreground")}>
					{entry.period}
				</span>
			</div>
			<ul className="mt-1 flex flex-col gap-0.5">
				{entry.bullets.map((bullet) => (
					<li className="flex gap-1.5 text-[12px] text-foreground/65 leading-snug" key={bullet}>
						<span className="mt-1.5 size-1 shrink-0 rounded-full bg-oxblood/60" />
						{bullet}
					</li>
				))}
			</ul>
		</div>
	);
}

/** Right rail: `Gauge` score + breakdown + one-click edits (real analysis panel). */
function AnalysisPanel() {
	return (
		<aside className="hidden w-72 shrink-0 lg:block">
			<div className="flex flex-col gap-4 rounded-lg bg-card p-3">
				<header className="flex items-center justify-between">
					<h3 className="text-muted-foreground text-sm">Análisis de tu CV</h3>
					<span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] text-foreground/60">Listo</span>
				</header>

				<div className="grid place-items-center gap-2">
					<p className="inline-flex items-center gap-1 text-muted-foreground text-xs">
						<TargetIcon className="size-3.5" />
						Puntaje para este puesto
					</p>
					<Gauge primary="success" size={104} value={86} />
					<span className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-foreground/5 py-1 text-foreground/60 text-xs">
						Detalles
						<CaretDownIcon className="size-3" />
					</span>
				</div>

				<ul className="flex flex-col gap-2">
					{SCORE_ROWS.map((row) => (
						<li key={row.label}>
							<div className="flex items-center justify-between text-xs">
								<span className="text-foreground/70">{row.label}</span>
								<span className="text-foreground/50">{row.value}</span>
							</div>
							<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
								<div className="h-full rounded-full bg-foreground/70" style={{ width: `${row.value}%` }} />
							</div>
						</li>
					))}
				</ul>

				<section className="flex flex-col gap-2">
					<p className="inline-flex items-center gap-1.5 text-muted-foreground text-xs">
						<ListChecksIcon className="size-3.5" />
						Mejoras de un clic
					</p>
					{SUGGESTIONS.map((suggestion) => (
						<SuggestionCard key={suggestion.title} suggestion={suggestion} />
					))}
				</section>
			</div>
		</aside>
	);
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
	return (
		<div className="flex flex-col gap-1.5 rounded-lg border p-2.5">
			<div className="flex items-start gap-2">
				<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-oxblood/15 text-oxblood">
					<CheckIcon className="size-3" />
				</span>
				<div className="min-w-0">
					<p className="text-[13px] text-foreground leading-tight">{suggestion.title}</p>
					<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{suggestion.body}</p>
				</div>
				<span className="grid size-5 shrink-0 place-items-center rounded-md text-foreground/40">
					<XIcon className="size-3" />
				</span>
			</div>
			<div className="flex items-center gap-2 pl-7">
				<span
					className={cn(
						"rounded-full px-1.5 py-0.5 text-[10px]",
						suggestion.tone === "success" ? "bg-oxblood/15 text-oxblood" : "bg-foreground/10 text-foreground/60"
					)}
				>
					+{suggestion.delta} pts
				</span>
				<span className="truncate text-[10px] text-muted-foreground">
					{suggestion.category} · {suggestion.severity}
				</span>
			</div>
		</div>
	);
}

/** Condensed single-column editor for small screens. */
function MobileEditorPreview({ className }: { className?: string }) {
	return (
		<div className={cn("w-full overflow-hidden rounded-xl border bg-background shadow-2xl shadow-black/40", className)}>
			<div className="flex items-center gap-1 border-b px-3 py-2 text-foreground/50">
				<SidebarSimpleIcon className="size-4" weight="duotone" />
				<span className="ml-auto inline-flex items-center gap-1 text-foreground/70 text-xs">
					<SparkleIcon className="size-3.5" weight="fill" />
					Free
				</span>
				<span className="grid size-6 place-items-center rounded-full bg-foreground/10 text-[10px] text-foreground/60">
					VR
				</span>
			</div>

			<div className="flex items-center justify-between gap-2 border-b px-3 py-2">
				<div className="min-w-0">
					<p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
						<CheckIcon className="size-3" />
						Guardado
					</p>
					<p className="text-foreground text-sm">CV — Product Designer</p>
				</div>
				<span className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] text-foreground/70">
					<ExportIcon className="size-3.5" />
					Exportar
				</span>
			</div>

			<div className="flex flex-col gap-3 p-3">
				<div className="rounded-md bg-card p-5 shadow-inner shadow-muted ring-1 ring-border/40">
					<header className="flex flex-col items-center gap-1 text-center">
						<h3 className="text-foreground text-xl">Valentina Ríos</h3>
						<p className="text-muted-foreground text-xs">Product Designer</p>
					</header>
					<DocSection title="Resumen">
						<p className="text-[12px] text-foreground/75 leading-relaxed">
							Diseñadora de producto con 7 años en B2B y fintech.{" "}
							<span className="rounded bg-oxblood/10 px-1 text-foreground ring-1 ring-oxblood/25">
								Aumenté la activación 18%.
							</span>
						</p>
					</DocSection>
				</div>

				<div className="flex items-center gap-3 rounded-lg bg-card p-3">
					<Gauge primary="success" size={72} value={86} />
					<div className="min-w-0">
						<p className="inline-flex items-center gap-1 text-muted-foreground text-xs">
							<TargetIcon className="size-3.5" />
							Puntaje para este puesto
						</p>
						<p className="mt-1 text-foreground/70 text-xs">Impacto 88 · Keywords 74 · Formato 96</p>
					</div>
				</div>
			</div>
		</div>
	);
}
