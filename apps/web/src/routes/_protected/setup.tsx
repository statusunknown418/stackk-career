import { CaretCircleRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingChat } from "@/components/domains/setup.chat/onboarding-chat";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameFooter, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
	step: z.enum(["chat"]).optional(),
	analysisStatus: z.enum(["idle", "complete"]).optional(),
	generationId: z.string().optional(),
	storeId: z.string().optional(),
});

export const Route = createFileRoute("/_protected/setup")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		if (search.step && !search.generationId) {
			throw redirect({ to: "/setup", search: {}, replace: true });
		}
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	const search = Route.useSearch();

	const createGeneration = useMutation(
		orpc.generations.create.mutationOptions({
			onSuccess: ({ id }) => {
				navigate({
					from: Route.fullPath,
					search: { step: "chat", generationId: id },
				});
			},
			onError: (error) => {
				toast.error(error.message || "No se pudo iniciar la sesión.");
			},
		})
	);

	const isWelcome = !(search.step && search.generationId);

	if (isWelcome) {
		return (
			<main className="grid place-items-center p-4">
				<Frame className="max-w-2xl">
					<FrameHeader>
						<FrameTitle className="font-light text-2xl tracking-tight">👋 Hola, empecemos!</FrameTitle>
						<FrameDescription>v.0.1 Stackk Career</FrameDescription>
					</FrameHeader>

					<FramePanel className="grid gap-2 text-sm">
						<p>Estamos complacidos en verte tomar el primer paso para mejorar tu futuro laboral.</p>

						<p>
							Al utilizar Stackk Career, te aseguramos que obtendrás el 100% de entrevistas. Queremos verte triunfar,
							así que empecemos de una vez conociendo un poco más de ti!
						</p>

						<SparkleIcon className="mt-4 size-8 text-success" weight="duotone" />
						<p className="text-success italic tracking-tight">The Founders</p>
					</FramePanel>

					<FrameFooter className="flex justify-end">
						<Button
							disabled={createGeneration.isPending}
							loading={createGeneration.isPending}
							onClick={() => createGeneration.mutate({ title: "Onboarding", summary: "Conociendo al usuario" })}
						>
							Continuar <CaretCircleRightIcon />
						</Button>
					</FrameFooter>
				</Frame>
			</main>
		);
	}

	if (search.step === "chat" && search.generationId) {
		return (
			<main className="grid place-items-center p-4">
				<section className="w-full max-w-2xl">
					<Frame>
						<FrameHeader>
							<FrameTitle className="font-light text-xl tracking-tight">Conozcámonos</FrameTitle>
							<FrameDescription>Responde unas preguntas para personalizar tu experiencia.</FrameDescription>
						</FrameHeader>

						<FramePanel className="p-0">
							<OnboardingChat />
						</FramePanel>

						{search.analysisStatus === "complete" && (
							<FrameFooter className="flex justify-end">
								<Button render={<Link to="/dash" />}>
									Ir a la app <CaretCircleRightIcon />
								</Button>
							</FrameFooter>
						)}
					</Frame>
				</section>
			</main>
		);
	}

	return null;
}
