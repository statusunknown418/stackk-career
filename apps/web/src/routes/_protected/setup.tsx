import { CaretLeftIcon, TriangleDashedIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ResumeAnalysis } from "@/components/setup.analysis/resume-analysis";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Form } from "@/components/ui/form";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/ui/frame";

export const Route = createFileRoute("/_protected/setup")({
	component: RouteComponent,
	validateSearch: z.object({
		step: z.enum(["initial", "attach", "analysis"]).optional(),
		storeId: z.string().optional(),
	}),
});

function RouteComponent() {
	const navigate = useNavigate();
	const search = Route.useSearch();

	const form = useForm({
		defaultValues: {
			experienceLevel: "0-years",
			industry: "software",
		},
		onSubmit: () =>
			navigate({
				from: Route.fullPath,
				search: {
					step: "attach",
				},
			}),
	});

	return (
		<main className="grid place-items-center">
			{(!search.step || search.step === "initial") && (
				<section className="w-full max-w-lg">
					<Frame>
						<FrameHeader>
							<FrameTitle className="font-light text-xl">Empecemos</FrameTitle>
							<FrameDescription>Conozcamos mas de ti</FrameDescription>
						</FrameHeader>

						<FramePanel>
							<Form
								className="grid gap-6"
								onSubmit={(e) => {
									e.preventDefault();
									form.handleSubmit();
								}}
							>
								<section className="flex min-h-40 items-center justify-center rounded-lg bg-muted">
									Preguntas de onboarding
								</section>

								<Button type="submit">Siguiente</Button>
							</Form>
						</FramePanel>
					</Frame>
				</section>
			)}

			{search.step === "attach" && (
				<section className="w-full max-w-lg">
					<Frame>
						<FrameHeader>
							<FrameTitle>Sube tu CV</FrameTitle>
						</FrameHeader>

						<FramePanel className="grid gap-4">
							<Dropzone
								endpoint="resumeUploader"
								onClientUploadComplete={(files) => {
									toast.success("CV subido");
									navigate({
										from: Route.fullPath,
										search: { step: "analysis", storeId: files.at(0)?.serverData.storedId },
									});
								}}
								onUploadError={(err) => toast.error(err.message)}
							/>

							<Button
								className="max-w-max"
								onClick={() => navigate({ from: Route.fullPath, search: { step: "attach" } })}
								variant="outline"
							>
								<CaretLeftIcon />
								Volver
							</Button>
						</FramePanel>
					</Frame>
				</section>
			)}

			{search.step === "analysis" && search.storeId && (
				<section className="w-full max-w-2xl">
					<ResumeAnalysis fileId={search.storeId} />
				</section>
			)}

			{search.step === "analysis" && !search.storeId && (
				<Alert className="max-w-2xl" variant="error">
					<TriangleDashedIcon />

					<AlertTitle>Missing file ID</AlertTitle>

					<AlertDescription>
						Please go back and upload your resume again, if the problem persists leave your brutal feedback here.
					</AlertDescription>

					<AlertAction>
						<Button
							render={
								<Link
									from={Route.fullPath}
									search={{
										step: "attach",
									}}
								/>
							}
							variant="ghost"
						>
							<MessageCircleIcon />
							Feedback
						</Button>

						<Button
							render={
								<Link
									from={Route.fullPath}
									search={{
										step: "attach",
									}}
								/>
							}
						>
							<CaretLeftIcon /> Volver
						</Button>
					</AlertAction>
				</Alert>
			)}
		</main>
	);
}
