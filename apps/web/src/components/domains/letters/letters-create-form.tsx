"use client";

import { createCoverLetterGenerationInputSchema } from "@stackk-career/schemas/api/letters";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface LettersCreateFormProps {
	onClose: () => void;
}

/**
 * /letters dialog body. Two fields, one mutation.
 *
 * Pattern calca de resume-create-form: bare TanStack `useForm` + a `useMutation`,
 * cache-invalidation on success, navigate to the detail route. The CV selector
 * is populated from `orpc.resumes.list` via Suspense (the parent dialog already
 * waits on the realtime token query so this Suspense boundary is harmless).
 */
export function LettersCreateForm({ onClose }: LettersCreateFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: resumes } = useSuspenseQuery(orpc.resumes.list.queryOptions());

	const createMutation = useMutation(
		orpc.letters.createGeneration.mutationOptions({
			onSuccess: ({ generationId }) => {
				queryClient.invalidateQueries({ queryKey: orpc.letters.list.queryKey() });
				onClose();
				navigate({ params: { generationId }, to: "/dash/letters/$generationId" });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const form = useForm({
		defaultValues: {
			jobPosition: "",
			language: "es" as "es" | "en",
			resumeId: resumes[0]?.id ?? "",
		},
		onSubmit: ({ value }) => {
			const parsed = createCoverLetterGenerationInputSchema.safeParse(value);
			if (!parsed.success) {
				toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
				return;
			}
			createMutation.mutate(parsed.data);
		},
	});

	if (resumes.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Aún no tienes CVs creados. Crea uno primero en la sección de Curriculums para poder generar cartas.
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field name="jobPosition">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-job-position">Puesto al que postulas</FieldLabel>
						<Input
							autoFocus
							disabled={createMutation.isPending}
							id="letters-job-position"
							maxLength={500}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Ej. Senior Product Manager en Yape"
							value={field.state.value}
						/>
						<FieldDescription>Sé específico: empresa + rol ayuda a CASEY a redactar mejor.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Field name="resumeId">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-resume-id">CV a vincular</FieldLabel>
						<Select onValueChange={(value) => field.handleChange(value ?? "")} value={field.state.value}>
							<SelectTrigger id="letters-resume-id">
								<SelectValue placeholder="Elige un CV" />
							</SelectTrigger>
							<SelectPopup>
								{resumes.map((resume) => (
									<SelectItem key={resume.id} value={resume.id}>
										{resume.title ?? "CV sin título"}
									</SelectItem>
								))}
							</SelectPopup>
						</Select>
						<FieldDescription>CASEY tomará tu experiencia y skills de este CV.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Field name="language">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-language">Idioma de la carta</FieldLabel>
						<Select
							onValueChange={(value) => field.handleChange((value ?? "es") as "es" | "en")}
							value={field.state.value}
						>
							<SelectTrigger id="letters-language">
								<SelectValue placeholder="Elige idioma" />
							</SelectTrigger>
							<SelectPopup>
								<SelectItem value="es">Español (LATAM)</SelectItem>
								<SelectItem value="en">English (US)</SelectItem>
							</SelectPopup>
						</Select>
						<FieldDescription>Usa inglés si postulas a un rol fuera de LATAM.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button disabled={isSubmitting || createMutation.isPending} type="submit">
						{(isSubmitting || createMutation.isPending) && <Loader />}
						Crear carta
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
