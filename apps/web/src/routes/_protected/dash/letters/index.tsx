import { ArrowUpRightIcon, ChatCircleTextIcon, ClockIcon, PlusCircleIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleHelpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LettersCreateDialog } from "@/components/domains/letters/letters-create-dialog";
import { TemplateCard } from "@/components/domains/letters/template-card";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { type Tour, TourProvider, useTour } from "@/components/ui/tour";
import { orpc } from "@/utils/orpc";

const dateTimeFormatter = new Intl.DateTimeFormat("es", {
	dateStyle: "long",
});

export const Route = createFileRoute("/_protected/dash/letters/")({
	component: RouteComponent,
	loader: ({ context }) =>
		Promise.allSettled([
			context.queryClient.ensureQueryData(orpc.letters.list.queryOptions()),
			context.queryClient.ensureQueryData(orpc.resumes.list.queryOptions()),
		]),
});

const TOUR_STORAGE_KEY = "stackk:letters-tour-seen";

const lettersTours: Tour[] = [
	{
		id: "letters-onboarding",
		steps: [
			{
				align: "start",
				content:
					"Elige el puesto, el CV base y el idioma. Casey redacta la carta y la abre en un espacio donde podrás refinarla.",
				id: "letters-create",
				side: "bottom",
				title: "Crea tu primera carta",
			},
			{
				content: "Aquí aparecen tus cartas. Ábrelas cuando quieras para revisarlas, editarlas o copiarlas.",
				id: "letters-list",
				side: "bottom",
				title: "Tus cartas",
			},
		],
	},
];

const TEMPLATE_LABELS: Record<string, string> = {
	centered: "Centrado",
	classic: "Clásico",
	minty: "Minty",
	blue: "Azul",
};

function RouteComponent() {
	return (
		<TourProvider tours={lettersTours}>
			<LettersView />
		</TourProvider>
	);
}

function LettersView() {
	const { data } = useSuspenseQuery(orpc.letters.list.queryOptions());
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<
		"centered" | "classic" | "minty" | "blue" | null | undefined
	>(undefined);
	const [step, setStep] = useState(1);

	const { start: startTour } = useTour();
	const hasAutoStartedTour = useRef(false);

	useEffect(() => {
		if (hasAutoStartedTour.current || typeof window === "undefined") {
			return;
		}
		if (localStorage.getItem(TOUR_STORAGE_KEY)) {
			return;
		}
		hasAutoStartedTour.current = true;
		localStorage.setItem(TOUR_STORAGE_KEY, "1");
		startTour("letters-onboarding");
	}, [startTour]);

	if (data.length === 0) {
		return (
			<section className="space-y-4 pt-6">
				<section className="mx-auto w-full max-w-7xl px-4 py-2">
					{step === 1 ? (
						<div className="relative overflow-hidden rounded-2xl border bg-card/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300">
							{/* Background ambient glow inside the card */}
							<div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-[60px]" />
							<div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[60px]" />

							<div className="relative flex flex-col items-center gap-6 py-8 text-center">
								<div className="inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/20">
									<ChatCircleTextIcon size={36} weight="duotone" />
								</div>

								<div className="space-y-2">
									<h2 className="font-semibold text-2xl text-foreground tracking-tight">
										Hola, soy <Shimmer>CASEY</Shimmer>
									</h2>
									<p className="mx-auto max-w-xl text-base text-muted-foreground leading-relaxed">
										Te ayudaré a redactar cartas de presentación a partir de tu CV y del puesto al que quieres postular.
									</p>
								</div>

								<Button
									className="mt-4 px-8 py-6 font-semibold text-base shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/30 hover:shadow-xl"
									onClick={() => {
										setSelectedTemplate(null);
										setStep(2);
									}}
									size="lg"
								>
									Siguiente
									<PlusCircleIcon size={20} />
								</Button>
							</div>
						</div>
					) : (
						<div className="fade-in slide-in-from-bottom-4 animate-in space-y-8 duration-300">
							<div className="flex items-center justify-between border-b pb-4">
								<div className="space-y-1">
									<h2 className="font-semibold text-xl tracking-tight">Elige un estilo para tu carta</h2>
									<p className="text-muted-foreground text-sm">
										Selecciona una plantilla o empieza desde cero para abrir el asistente de creación.
									</p>
								</div>
								<Button onClick={() => setStep(1)} size="sm" variant="ghost-muted">
									Atrás
								</Button>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								{/* Formal Group */}
								<div className="flex flex-col gap-4 rounded-xl border bg-card/30 p-5 backdrop-blur-xs transition-all duration-300 hover:border-indigo-500/20 hover:bg-card/45 hover:shadow-indigo-500/[0.02] hover:shadow-xl">
									<div className="space-y-1.5">
										<h3 className="font-semibold text-base text-foreground">Formales</h3>
										<p className="text-muted-foreground text-xs leading-relaxed">
											Estructuras clásicas, limpias y profesionales que priorizan la sobriedad y van directo al grano.
											Ideal para sectores corporativos y tradicionales.
										</p>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<TemplateCard
											author="Brian T. Wayne"
											onClick={() => {
												setSelectedTemplate("centered");
												setIsCreateOpen(true);
											}}
											subtitle="COVER LETTER CENTERED"
											title="CLASSIC"
											type="centered"
										/>
										<TemplateCard
											author="Andrew O'Sullivan"
											onClick={() => {
												setSelectedTemplate("classic");
												setIsCreateOpen(true);
											}}
											subtitle="COVER LETTER TEMPLATE"
											title="CLASSIC"
											type="classic"
										/>
									</div>
								</div>

								{/* Creative Group */}
								<div className="flex flex-col gap-4 rounded-xl border bg-card/30 p-5 backdrop-blur-xs transition-all duration-300 hover:border-emerald-500/20 hover:bg-card/45 hover:shadow-emerald-500/[0.02] hover:shadow-xl">
									<div className="space-y-1.5">
										<h3 className="font-semibold text-base text-foreground">Creativos</h3>
										<p className="text-muted-foreground text-xs leading-relaxed">
											Diseños dinámicos, modernos y visuales creados para destacar y demostrar tu originalidad.
											Recomendado para puestos de diseño, marketing y tecnología.
										</p>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<TemplateCard
											author="Anna Field"
											onClick={() => {
												setSelectedTemplate("minty");
												setIsCreateOpen(true);
											}}
											subtitle="MINIMALISTIC COVER LETTER"
											title="MINTY"
											type="minty"
										/>
										<TemplateCard
											author="Andrew O'Sullivan"
											onClick={() => {
												setSelectedTemplate("blue");
												setIsCreateOpen(true);
											}}
											subtitle="MODERN COVER LETTER WITH BLUE..."
											title="BLUE CLASSIC"
											type="blue"
										/>
									</div>
								</div>
							</div>

							{/* Blank Template option */}
							<div className="flex flex-col gap-3 rounded-xl border bg-card/10 p-5 transition-all duration-300 hover:border-primary/20 hover:bg-card/20 hover:shadow-lg">
								<div className="space-y-1">
									<h3 className="font-semibold text-base text-foreground">En blanco</h3>
									<p className="text-muted-foreground text-xs leading-relaxed">
										Comienza con un lienzo despejado y dale forma de manera libre y personalizada.
									</p>
								</div>

								<button
									className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-muted-foreground/25 border-dashed p-6 text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
									onClick={() => {
										setSelectedTemplate(null);
										setIsCreateOpen(true);
									}}
									type="button"
								>
									<div className="rounded-full bg-muted p-2.5 transition-colors group-hover:bg-primary/10">
										<PlusCircleIcon className="transition-transform group-hover:scale-110" size={24} />
									</div>
									<span className="font-medium text-sm">Crear en blanco</span>
								</button>
							</div>
						</div>
					)}
				</section>

				<LettersCreateDialog onOpenChange={setIsCreateOpen} open={isCreateOpen} template={selectedTemplate} />
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<section className="flex items-start justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Cartas de presentación</h1>
					<FrameDescription>
						<Shimmer>CASEY</Shimmer> redacta cartas a partir de tu CV y del puesto al que postulas.
					</FrameDescription>

					<div className="mt-4 flex flex-wrap items-center gap-2">
						<Button
							className="max-w-max"
							data-tour-step-id="letters-create"
							onClick={() => {
								setSelectedTemplate(undefined);
								setIsCreateOpen(true);
							}}
						>
							<PlusCircleIcon />
							Nueva carta
						</Button>

						<Button
							aria-label="Ver tutorial de cartas"
							onClick={() => startTour("letters-onboarding")}
							size="sm"
							variant="ghost-muted"
						>
							<CircleHelpIcon />
							Cómo funciona
						</Button>
					</div>
				</article>

				{data.length > 0 && (
					<p className="shrink-0 text-muted-foreground text-sm">
						{data.length} {data.length === 1 ? "carta" : "cartas"}
					</p>
				)}
			</section>

			<section className="px-4 py-2" data-tour-step-id="letters-list">
				{data.length > 0 ? (
					<ul className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{data.map((letter) => (
							<li key={letter.id}>
								<Link
									className="group/card block h-full focus-visible:outline-none"
									params={{ generationId: letter.id }}
									to="/dash/letters/$generationId"
								>
									<article className="relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 group-hover/card:-translate-y-0.5 group-hover/card:border-primary/40 group-hover/card:shadow-lg group-focus-visible/card:border-primary/50 group-focus-visible/card:ring-2 group-focus-visible/card:ring-ring/40">
										{/* Accent line that grows on hover */}
										<span
											aria-hidden="true"
											className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover/card:scale-x-100"
										/>
										<div className="flex items-start justify-between gap-3">
											<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-200 group-hover/card:bg-primary/15">
												<ChatCircleTextIcon size={20} weight="duotone" />
											</span>
											<div className="flex items-center gap-1.5">
												{letter.template && (
													<span className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-1.5 py-0.5 font-medium text-[0.6rem] text-indigo-650 uppercase tracking-wide dark:text-indigo-400">
														{TEMPLATE_LABELS[letter.template] || letter.template}
													</span>
												)}
												{!letter.template && (
													<span className="rounded-md border px-1.5 py-0.5 font-medium text-[0.6rem] text-muted-foreground uppercase tracking-wide">
														En blanco
													</span>
												)}
												<span className="rounded-md border px-1.5 py-0.5 font-mono text-[0.6rem] text-muted-foreground uppercase tracking-wide">
													{letter.language === "en" ? "EN" : "ES"}
												</span>
												<ArrowUpRightIcon
													className="size-4 text-muted-foreground transition-all duration-200 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-foreground"
													weight="bold"
												/>
											</div>
										</div>
										<div className="flex flex-1 flex-col">
											{letter.resumeTitle && (
												<span className="mb-2 inline-flex max-w-full items-center gap-1 self-start rounded-full border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground text-xs">
													<ReadCvLogoIcon className="size-3 shrink-0" weight="bold" />
													<span className="truncate">{letter.resumeTitle}</span>
												</span>
											)}
											<h3 className="line-clamp-1 font-medium text-base leading-snug">
												{letter.title ?? "Sin título"}
											</h3>
											{letter.preview && (
												<p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
													{letter.preview}
												</p>
											)}
											{letter.updatedAt && (
												<p className="mt-auto flex items-center gap-1.5 pt-4 text-muted-foreground text-xs">
													<ClockIcon className="shrink-0" size={12} weight="bold" />
													<span>Actualizada el {dateTimeFormatter.format(new Date(letter.updatedAt))}</span>
												</p>
											)}
										</div>
									</article>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<Empty className="rounded-xl border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<ChatCircleTextIcon />
							</EmptyMedia>
							<EmptyTitle>Aún no hay cartas</EmptyTitle>
							<EmptyDescription>
								Crea tu primera carta con <Shimmer>CASEY</Shimmer> en menos de un minuto.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={() => setIsCreateOpen(true)} size="sm">
								<PlusCircleIcon />
								Crear carta
							</Button>
						</EmptyContent>
					</Empty>
				)}
			</section>

			<LettersCreateDialog onOpenChange={setIsCreateOpen} open={isCreateOpen} template={selectedTemplate} />
		</section>
	);
}
