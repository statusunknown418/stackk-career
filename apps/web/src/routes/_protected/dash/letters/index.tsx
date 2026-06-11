import { ArrowUpRightIcon, ChatCircleTextIcon, ClockIcon, PlusCircleIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LettersCreateDialog } from "@/components/domains/letters/letters-create-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/letters/")({
	component: RouteComponent,
	loader: ({ context }) => context.queryClient.ensureQueryData(orpc.letters.list.queryOptions()),
});

// Module-level: Intl.DateTimeFormat is expensive to build and depends on no props/state.
// `timeStyle: "short"` adds HH:mm to distinguish letters updated the same day.
const dateTimeFormatter = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });

function RouteComponent() {
	const { data } = useSuspenseQuery(orpc.letters.list.queryOptions());
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	return (
		<section className="space-y-4">
			<section className="flex items-start justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Cartas de presentación</h1>
					<FrameDescription>
						<Shimmer>CASEY</Shimmer> redacta cartas a partir de tu CV y del puesto al que postulas.
					</FrameDescription>

					<Button className="mt-4 max-w-max" onClick={() => setIsCreateOpen(true)}>
						<PlusCircleIcon />
						Nueva carta
					</Button>
				</article>

				{data.length > 0 && (
					<p className="shrink-0 text-muted-foreground text-sm">
						{data.length} {data.length === 1 ? "carta" : "cartas"}
					</p>
				)}
			</section>

			<section className="px-4 py-2">
				{data.length > 0 ? (
					<ul className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
											<div className="flex items-center gap-2">
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

			<LettersCreateDialog onOpenChange={setIsCreateOpen} open={isCreateOpen} />
		</section>
	);
}
