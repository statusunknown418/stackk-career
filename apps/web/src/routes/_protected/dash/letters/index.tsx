import { ChatCircleTextIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LettersCreateDialog } from "@/components/domains/letters/letters-create-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from "@/components/ui/item";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_protected/dash/letters/")({
	component: RouteComponent,
	loader: ({ context }) => context.queryClient.ensureQueryData(orpc.letters.list.queryOptions()),
});

// Module-level: el Intl.DateTimeFormat es caro de construir y no depende de props/state.
// `timeStyle: "short"` agrega HH:mm — para distinguir cartas actualizadas el mismo día
// (request del user al ver 3 cartas con la misma fecha sin hora).
const dateTimeFormatter = new Intl.DateTimeFormat("es", { dateStyle: "long", timeStyle: "short" });

function RouteComponent() {
	const { data } = useSuspenseQuery(orpc.letters.list.queryOptions());
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	return (
		<section className="space-y-4">
			<section className="flex justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Cartas de presentación</h1>
					<FrameDescription>
						<Shimmer>CASEY</Shimmer> redacta cover letters a partir de tu CV y del puesto al que postulas.
					</FrameDescription>

					<Button className="mt-4 max-w-max" onClick={() => setIsCreateOpen(true)}>
						<PlusCircleIcon />
						Nueva carta
					</Button>
				</article>
			</section>

			<section className="px-4 py-2">
				{data.length > 0 ? (
					<ul className="grid list-none gap-2">
						{data.map((letter) => (
							<li key={letter.id}>
								<Link
									className="block transition-opacity hover:opacity-80"
									params={{ generationId: letter.id }}
									to="/dash/letters/$generationId"
								>
									<Item variant="outline">
										<ItemHeader>
											<ChatCircleTextIcon weight="duotone" />
										</ItemHeader>
										<ItemContent>
											<ItemTitle>{letter.title ?? "Sin título"}</ItemTitle>
											{letter.updatedAt && (
												<ItemDescription>
													Actualizada el {dateTimeFormatter.format(new Date(letter.updatedAt))}
												</ItemDescription>
											)}
										</ItemContent>
									</Item>
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
