import { ChatCircleTextIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CircleHelpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { LetterCard } from "@/components/domains/letters/letter-card";
import { LettersCreateDialog } from "@/components/domains/letters/letters-create-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FrameDescription } from "@/components/ui/frame";
import { type Tour, TourProvider, useTour } from "@/components/ui/tour";
import { orpc } from "@/utils/orpc";

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

	return (
		<section className="space-y-4">
			<section className="flex items-start justify-between gap-4 bg-card px-4 py-6 lg:gap-10">
				<article className="grid gap-1">
					<h1 className="font-light text-2xl">Cartas de presentación</h1>
					<FrameDescription>
						<Shimmer>CASEY</Shimmer> redacta cartas a partir de tu CV y del puesto al que postulas.
					</FrameDescription>

					<div className="mt-4 flex flex-wrap items-center gap-2">
						<Button className="max-w-max" data-tour-step-id="letters-create" onClick={() => setIsCreateOpen(true)}>
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
								<LetterCard letter={letter} />
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
