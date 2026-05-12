import { ArrowRightIcon, CheckCircleIcon, VideoConferenceIcon } from "@phosphor-icons/react";
import { env } from "@stackk-career/env/web";
import type { CoachingBookingSummary, CoachingStage, CoachingStepSummary } from "@stackk-career/schemas/api/coaching";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	compareAsc,
	differenceInCalendarDays,
	format,
	formatDistanceToNowStrict,
	isFuture,
	isToday,
	isTomorrow,
	startOfToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { startTransition, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/coaches")({
	component: RouteComponent,
	beforeLoad: () => queryClient.ensureQueryData(orpc.coaching.dashboard.queryOptions()),
});

const CAL_ORIGIN = env.VITE_CAL_COM_ORIGIN ?? "https://cal.com";
const CAL_IFRAME_HEIGHT = 760;
const TRAILING_SLASH_REGEX = /\/$/u;
const LEADING_SLASH_REGEX = /^\/+/u;
const CAL_HOST_PREFIX_REGEX = /^https?:\/\/[^/]+\//u;

const CAL_LINKS_BY_STAGE: Record<CoachingStage, string | undefined> = {
	"cv-analysis": env.VITE_CAL_COM_CV_ANALYSIS_LINK,
	"follow-up": env.VITE_CAL_COM_FOLLOW_UP_LINK,
	"general-coaching": env.VITE_CAL_COM_GENERAL_COACHING_LINK,
	"pre-interview-training": env.VITE_CAL_COM_PRE_INTERVIEW_LINK,
};

const CAL_ENV_KEYS_BY_STAGE: Record<CoachingStage, string> = {
	"cv-analysis": "VITE_CAL_COM_CV_ANALYSIS_LINK",
	"follow-up": "VITE_CAL_COM_FOLLOW_UP_LINK",
	"general-coaching": "VITE_CAL_COM_GENERAL_COACHING_LINK",
	"pre-interview-training": "VITE_CAL_COM_PRE_INTERVIEW_LINK",
};

const STAGE_COPY: Record<CoachingStage, { eyebrow: string; headline: string; support: string }> = {
	"cv-analysis": {
		eyebrow: "Primer checkpoint",
		headline: "Pulimos CV antes de entrar a entrevistas.",
		support: "Revisamos narrativa, impacto, gaps y priorización para que cada envío tenga más señal.",
	},
	"follow-up": {
		eyebrow: "Cierre de ciclo",
		headline: "Seguimiento corto para ajustar con datos reales.",
		support: "Volvemos sobre feedback, nuevas entrevistas y próximos movimientos para no perder inercia.",
	},
	"general-coaching": {
		eyebrow: "Bloqueo puntual",
		headline: "Coaching abierto para estrategia, negociación o foco.",
		support: "Sesión flexible para destrabar lo que hoy más mueve tu búsqueda.",
	},
	"pre-interview-training": {
		eyebrow: "Momento de práctica",
		headline: "Entrenamos pitch, timing y preguntas difíciles.",
		support: "Simulación enfocada en entrevistas reales para llegar con respuestas nítidas y ritmo.",
	},
};

const STAGE_SURFACE: Record<
	CoachingStage,
	{
		accentClass: string;
		panelClass: string;
		pillClass: string;
	}
> = {
	"cv-analysis": {
		accentClass: "border-info/30 bg-info/10",
		panelClass: "bg-muted/40",
		pillClass: "bg-info/10 text-info-foreground",
	},
	"follow-up": {
		accentClass: "border-success/30 bg-success/10",
		panelClass: "bg-muted/40",
		pillClass: "bg-success/10 text-success-foreground",
	},
	"general-coaching": {
		accentClass: "border-warning/30 bg-warning/10",
		panelClass: "bg-muted/40",
		pillClass: "bg-warning/10 text-warning-foreground",
	},
	"pre-interview-training": {
		accentClass: "border-primary/30 bg-primary/10",
		panelClass: "bg-muted/40",
		pillClass: "bg-primary/10 text-primary",
	},
};

function normalizeCalLink(input: string): string {
	return input.replace(CAL_HOST_PREFIX_REGEX, "").replace(LEADING_SLASH_REGEX, "");
}

function buildCalUrl(input: string, origin: string): string {
	if (input.startsWith("http://") || input.startsWith("https://")) {
		return input;
	}

	return `${origin.replace(TRAILING_SLASH_REGEX, "")}/${normalizeCalLink(input)}`;
}

function getEmbeddedCalUrl(url: string): string {
	try {
		const parsedUrl = new URL(url);
		parsedUrl.searchParams.set("embed", "true");
		return parsedUrl.toString();
	} catch {
		return url;
	}
}

function formatSessionDate(date: Date | null): string {
	if (!date) {
		return "Por confirmar";
	}

	return format(date, "EEE d MMM · h:mm a", { locale: es });
}

function formatRelativeSession(date: Date | null): string {
	if (!date) {
		return "sin fecha";
	}

	if (isToday(date)) {
		return "hoy";
	}

	if (isTomorrow(date)) {
		return "mañana";
	}

	return `en ${differenceInCalendarDays(date, startOfToday())} días`;
}

function getHeroDescription({
	hasResumeAnalysis,
	recommendedStage,
	resumeCount,
}: {
	hasResumeAnalysis: boolean;
	recommendedStage: CoachingStage;
	resumeCount: number;
}): string {
	if (recommendedStage === "cv-analysis" && hasResumeAnalysis) {
		return "Tu análisis AI ya existe. Falta contraste humano para decidir qué editar primero.";
	}

	if (recommendedStage === "cv-analysis") {
		return "Empezamos por CV para subir claridad antes de mocks o coaching más abierto.";
	}

	if (recommendedStage === "pre-interview-training") {
		return `Ya tienes ${
			resumeCount === 1 ? "1 CV listo" : `${resumeCount} CVs listos`
		}. Siguiente paso: practicar entrevista con contexto real.`;
	}

	if (recommendedStage === "general-coaching") {
		return "Base lista. Esta sesión sirve para estrategia, targets, negociación o un bloqueo puntual.";
	}

	return "Entraste en fase de seguimiento. Mantén ritmo con una revisión corta de próximos movimientos.";
}

function getSchedulerBenefits(stage: CoachingStage): string[] {
	switch (stage) {
		case "cv-analysis":
			return [
				"Detectar huecos de narrativa antes de aplicar en volumen.",
				"Priorizar cambios que sí afectan lectura ATS y recruiter.",
				"Salir con plan claro de edición, no solo feedback suelto.",
			];
		case "pre-interview-training":
			return [
				"Practicar pitch inicial con timing real de entrevista.",
				"Pulir respuestas difíciles antes del panel.",
				"Ajustar energía, claridad y cierre de historias.",
			];
		case "general-coaching":
			return [
				"Destrabar estrategia de búsqueda y targets.",
				"Revisar negociación, foco y decisiones próximas.",
				"Usar sesión como espacio flexible de alto leverage.",
			];
		case "follow-up":
			return [
				"Convertir feedback real en siguientes movimientos.",
				"Evitar perder ritmo entre entrevistas y aplicaciones.",
				"Recalibrar plan con evidencia, no intuición.",
			];
		default:
			return [];
	}
}

function getStageIndex(stage: CoachingStage, orderedStages: readonly { stage: CoachingStage }[]): number {
	return orderedStages.findIndex((step) => step.stage === stage) + 1;
}

function getStepCardClass({ isActive, isCompleted }: { isActive: boolean; isCompleted: boolean }): string {
	if (isActive) {
		return "border-foreground bg-foreground text-background shadow-xl";
	}

	if (isCompleted) {
		return "border-border bg-muted/40 text-foreground";
	}

	return "border-border/70 bg-background hover:bg-muted/40";
}

function getStepIndexClass({ isActive, isCompleted }: { isActive: boolean; isCompleted: boolean }): string {
	if (isActive) {
		return "border-background/30 bg-background/10 text-background";
	}

	if (isCompleted) {
		return "border-transparent bg-foreground text-background";
	}

	return "bg-background text-foreground";
}

function RouteStepButton({
	index,
	isActive,
	isCompleted,
	isRecommended,
	onSelect,
	shouldReduceMotion,
	step,
}: {
	index: number;
	isActive: boolean;
	isCompleted: boolean;
	isRecommended: boolean;
	onSelect: (stage: CoachingStage) => void;
	shouldReduceMotion: boolean;
	step: CoachingStepSummary;
}) {
	return (
		<motion.button
			className={cn(
				"flex w-56 shrink-0 flex-col gap-3 rounded-xl border px-3 py-3 text-left transition-transform duration-200 ease-out active:scale-95",
				getStepCardClass({ isActive, isCompleted })
			)}
			onClick={() => {
				startTransition(() => {
					onSelect(step.stage);
				});
			}}
			type="button"
			whileHover={shouldReduceMotion ? undefined : { y: -2 }}
			whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
		>
			<div className="flex items-center justify-between gap-3">
				<div
					className={cn(
						"flex size-9 items-center justify-center rounded-full border text-xs",
						getStepIndexClass({ isActive, isCompleted })
					)}
				>
					{isCompleted && !isActive ? <CheckCircleIcon weight="fill" /> : <span>0{index + 1}</span>}
				</div>

				{isRecommended ? <Badge variant="info">Next</Badge> : null}
			</div>

			<div>
				<p className={cn("font-medium text-sm", isActive ? "text-background" : "text-foreground")}>{step.label}</p>
				<p
					className={cn(
						"mt-1 line-clamp-3 text-xs leading-relaxed",
						isActive ? "text-background/70" : "text-muted-foreground"
					)}
				>
					{step.description}
				</p>
			</div>
		</motion.button>
	);
}

function BookingHistoryItem({
	booking,
	isNext,
	relative,
	stepLabel,
}: {
	booking: CoachingBookingSummary;
	isNext: boolean;
	relative: string;
	stepLabel: string;
}) {
	return (
		<li
			className={
				isNext
					? "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl bg-foreground px-3 py-3 text-background"
					: "grid grid-cols-[auto_1fr_auto] items-center gap-4 px-3 py-2"
			}
		>
			<div
				className={
					isNext
						? "flex w-12 flex-col items-center rounded-md bg-background/10 py-1 font-mono uppercase"
						: "flex w-12 flex-col items-center rounded-md border bg-muted/40 py-1 font-mono uppercase"
				}
			>
				<span className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>
					{booking.startsAt ? format(booking.startsAt, "EEE", { locale: es }) : "--"}
				</span>
				<span className="font-light text-lg leading-none">
					{booking.startsAt ? format(booking.startsAt, "dd") : "--"}
				</span>
				<span className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>
					{booking.startsAt ? format(booking.startsAt, "MMM", { locale: es }) : "--"}
				</span>
			</div>

			<div className="min-w-0">
				<p className="flex items-baseline gap-2">
					<span className="truncate font-medium text-sm">{stepLabel}</span>
					<span className={isNext ? "truncate text-xs opacity-70" : "truncate text-muted-foreground text-xs"}>
						{booking.bookingStatus}
					</span>
				</p>
				<p className={isNext ? "truncate text-sm opacity-80" : "truncate text-muted-foreground text-sm"}>
					{booking.title ?? "Sesión agendada desde coaching"}
				</p>
			</div>

			<div className="flex flex-col items-end gap-1 font-mono">
				<p className="text-sm">{booking.startsAt ? format(booking.startsAt, "h:mma") : "--:--"}</p>
				<p className={isNext ? "text-xs opacity-70" : "text-muted-foreground text-xs"}>{relative}</p>
				{booking.videoCallUrl ? (
					<a
						className={cn(
							"inline-flex items-center gap-1 text-xs transition-colors",
							isNext ? "text-background/80 hover:text-background" : "text-primary hover:text-primary/80"
						)}
						href={booking.videoCallUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<VideoConferenceIcon className="size-3.5" />
						Entrar
					</a>
				) : null}
			</div>
		</li>
	);
}

function RouteComponent() {
	const shouldReduceMotion = useReducedMotion();
	const dashboardQuery = orpc.coaching.dashboard.queryOptions();
	const { data } = useSuspenseQuery(dashboardQuery);
	const [activeStage, setActiveStage] = useState<CoachingStage>(data.recommendedStage);

	const activeStep = data.steps.find((step) => step.stage === activeStage) ?? data.steps[0];
	const activeStageIndex = getStageIndex(activeStage, data.steps);
	const activeCopy = STAGE_COPY[activeStage];
	const activeSurface = STAGE_SURFACE[activeStage];
	const activeBenefits = getSchedulerBenefits(activeStage);
	const activeLinkValue = CAL_LINKS_BY_STAGE[activeStage];
	const activeCalUrl = activeLinkValue ? buildCalUrl(activeLinkValue, CAL_ORIGIN) : null;
	const activeCalSlug = activeLinkValue ? normalizeCalLink(activeLinkValue) : null;
	const recommendedStepLabel = data.steps.find((step) => step.stage === data.recommendedStage)?.label ?? "Sin definir";
	const upcomingBookings = data.bookings
		.filter((booking) => booking.startsAt && isFuture(booking.startsAt))
		.sort((left, right) => {
			if (!(left.startsAt && right.startsAt)) {
				return 0;
			}

			return compareAsc(left.startsAt, right.startsAt);
		});
	const nextBooking = upcomingBookings[0] ?? null;
	const heroDescription = getHeroDescription({
		hasResumeAnalysis: data.hasResumeAnalysis,
		recommendedStage: data.recommendedStage,
		resumeCount: data.resumeCount,
	});
	const today = format(startOfToday(), "EEE, d MMM", { locale: es });

	return (
		<main className="flex w-full max-w-6xl flex-col gap-6 px-11 py-7">
			<header className="space-y-1">
				<p className="flex items-center gap-2 pl-0.5 font-mono text-muted-foreground text-xs uppercase">
					<span aria-hidden className="size-1.5 rounded-full bg-success" />
					<span>{today}</span>
					<span aria-hidden>·</span>
					<span>Coaching</span>
				</p>

				<h1 className="text-balance font-light text-2xl leading-tight tracking-tight md:text-4xl">
					Agenda de coaching
				</h1>

				<p className="max-w-2xl text-muted-foreground text-sm">{heroDescription}</p>
			</header>

			<section aria-label="Resumen de coaching" className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<FramePanel className="flex flex-col gap-3 p-4">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">Paso actual</p>
					<p className="font-light text-3xl tracking-tight">0{activeStageIndex}</p>
					<p className="text-muted-foreground text-xs">{activeStep.label}</p>
				</FramePanel>

				<FramePanel className="flex flex-col gap-3 p-4">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">Siguiente recomendado</p>
					<p className="font-light text-3xl tracking-tight">{data.bookings.length}</p>
					<p className="text-muted-foreground text-xs">{recommendedStepLabel}</p>
				</FramePanel>

				<FramePanel className="flex flex-col gap-3 p-4">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">Próxima sesión</p>
					<p className="font-light text-3xl tracking-tight">
						{nextBooking ? formatRelativeSession(nextBooking.startsAt) : "0"}
					</p>
					<p className="text-muted-foreground text-xs">
						{nextBooking ? formatSessionDate(nextBooking.startsAt) : "Aún no tienes una sesión agendada."}
					</p>
				</FramePanel>

				<FramePanel className="flex flex-col gap-3 p-4">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">Ruta cerrada</p>
					<p className="font-light text-3xl tracking-tight">
						{data.completedSteps}
						<span className="ml-1 text-muted-foreground text-sm">/ {data.steps.length}</span>
					</p>
					<p className="text-muted-foreground text-xs">
						{data.hasResumeAnalysis ? "Diagnóstico de CV listo" : "Diagnóstico de CV pendiente"}
					</p>
				</FramePanel>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<Frame>
					<FrameHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<FrameTitle>Ruta de coaching</FrameTitle>
							<FrameDescription>{activeStep.label}</FrameDescription>
						</div>

						<Badge className={cn("border-0", activeSurface.pillClass)}>{activeCopy.eyebrow}</Badge>
					</FrameHeader>

					<FramePanel className="overflow-x-auto">
						<div className="flex min-w-max items-stretch gap-3">
							{data.steps.map((step, index) => (
								<RouteStepButton
									index={index}
									isActive={step.stage === activeStage}
									isCompleted={step.completed}
									isRecommended={step.stage === data.recommendedStage}
									key={step.stage}
									onSelect={setActiveStage}
									shouldReduceMotion={shouldReduceMotion}
									step={step}
								/>
							))}
						</div>
					</FramePanel>

					<FramePanel className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
						<div>
							<p className="font-medium text-sm">{activeCopy.headline}</p>
							<p className="mt-2 text-muted-foreground text-sm">{activeCopy.support}</p>
						</div>

						<ul className="space-y-2 text-sm">
							{activeBenefits.map((benefit) => (
								<li className="flex gap-2" key={benefit}>
									<CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-success" weight="fill" />
									<span>{benefit}</span>
								</li>
							))}
						</ul>
					</FramePanel>
				</Frame>

				<Frame className={activeSurface.panelClass}>
					<FrameHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<FrameTitle>Scheduler</FrameTitle>
							<FrameDescription>{activeStep.label}</FrameDescription>
						</div>

						{activeCalUrl ? (
							<a
								className={buttonVariants({ size: "xs", variant: "ghost-muted" })}
								href={activeCalUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								Abrir
								<ArrowRightIcon />
							</a>
						) : null}
					</FrameHeader>

					<AnimatePresence initial={false} mode="wait">
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
							initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
							key={activeStage}
							transition={{
								duration: shouldReduceMotion ? 0 : 0.18,
								ease: [0.23, 1, 0.32, 1],
							}}
						>
							<FramePanel className={cn("overflow-hidden p-2", activeSurface.accentClass)}>
								{activeCalUrl && activeCalSlug ? (
									<div className="overflow-hidden rounded-lg border bg-background">
										<div className="flex items-center justify-between border-b px-4 py-3">
											<div className="flex items-center gap-2">
												<span className="size-2 rounded-full bg-foreground/20" />
												<span className="size-2 rounded-full bg-foreground/20" />
												<span className="size-2 rounded-full bg-foreground/20" />
											</div>
											<p className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
												cal.com / {activeCalSlug}
											</p>
										</div>

										<iframe
											className="w-full bg-background"
											loading="lazy"
											src={getEmbeddedCalUrl(activeCalUrl)}
											style={{ height: CAL_IFRAME_HEIGHT }}
											title={`Agendar ${activeStep.label}`}
										/>
									</div>
								) : (
									<div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed bg-background px-8 text-center">
										<div className="max-w-sm space-y-2">
											<p className="font-medium text-sm">Scheduler no configurado</p>
											<p className="text-muted-foreground text-sm">
												Falta variable <code>{CAL_ENV_KEYS_BY_STAGE[activeStage]}</code> para esta etapa.
											</p>
										</div>
									</div>
								)}
							</FramePanel>
						</motion.div>
					</AnimatePresence>
				</Frame>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<Frame>
					<FrameHeader>
						<FrameTitle>Estado de agenda</FrameTitle>
						<FrameDescription>Lo importante sin ruido</FrameDescription>
					</FrameHeader>

					<FramePanel className="grid gap-3">
						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
							<span className="text-muted-foreground">Siguiente sesión</span>
							<p className="mt-1 font-medium">
								{nextBooking ? formatSessionDate(nextBooking.startsAt) : "Aún no tienes una sesión agendada."}
							</p>
						</div>

						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
							<span className="text-muted-foreground">Estado actual</span>
							<p className="mt-1 font-medium">
								{data.hasResumeAnalysis ? "Diagnóstico de CV listo" : "Diagnóstico de CV pendiente"}
							</p>
						</div>

						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">
							<span className="text-muted-foreground">Ruta completada</span>
							<p className="mt-1 font-medium">
								{data.completedSteps} de {data.steps.length} etapas cerradas
							</p>
						</div>
					</FramePanel>

					<FramePanel className="grid gap-3">
						<p className="font-medium text-sm">Qué guardamos</p>
						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">Identificador de la reserva</div>
						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">Tipo de sesión elegida</div>
						<div className="rounded-lg bg-muted/40 px-3 py-3 text-sm">Fecha, estado y enlace de videollamada</div>
					</FramePanel>
				</Frame>

				<Frame>
					<FrameHeader className="flex flex-row items-center justify-between gap-4">
						<div>
							<FrameTitle>Historial</FrameTitle>
							<FrameDescription>{data.bookings.length} sesiones guardadas</FrameDescription>
						</div>
					</FrameHeader>

					<FramePanel>
						{data.bookings.length === 0 ? (
							<div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed px-6 text-center">
								<div className="max-w-sm space-y-2">
									<p className="font-medium text-sm">Todavía no hay sesiones reservadas</p>
									<p className="text-muted-foreground text-sm">Cuando agendes una sesión, aparecerá aquí.</p>
								</div>
							</div>
						) : (
							<ol className="flex flex-col gap-2">
								{data.bookings.map((booking, index) => {
									const step = data.steps.find((item) => item.stage === booking.stage);
									const relative =
										booking.startsAt === null
											? "sin fecha"
											: formatDistanceToNowStrict(booking.startsAt, {
													addSuffix: true,
													locale: es,
												});

									return (
										<BookingHistoryItem
											booking={booking}
											isNext={index === 0}
											key={booking.id}
											relative={relative}
											stepLabel={step?.label ?? booking.stage}
										/>
									);
								})}
							</ol>
						)}
					</FramePanel>
				</Frame>
			</section>
		</main>
	);
}
