"use client";

import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import { coverLetterLanguageSchema, createCoverLetterGenerationInputSchema } from "@stackk-career/schemas/api/letters";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

	const resumeOptions = resumes.map((resume) => ({
		label: resume.title ?? "CV sin título",
		value: resume.id,
	}));

	const languageOptions: ReadonlyArray<{ label: string; value: CoverLetterLanguage }> = [
		{ label: "Español (LATAM)", value: "es" },
		{ label: "English (US)", value: "en" },
	];

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

	// Tipar el objeto (en vez de castear `language`) deja que useForm infiera el union
	// correcto sin type assertions.
	const defaultValues: {
		jobPosition: string;
		jobDescription: string;
		language: CoverLetterLanguage;
		resumeId: string;
	} = {
		jobPosition: "",
		jobDescription: "",
		language: "es",
		resumeId: resumes[0]?.id ?? "",
	};

	const form = useForm({
		defaultValues,
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

			<form.Field name="jobDescription">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-job-description">Descripción del puesto</FieldLabel>
						<Textarea
							disabled={createMutation.isPending}
							id="letters-job-description"
							maxLength={5000}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Pega aquí la descripción del puesto o contexto de la oferta de trabajo para que CASEY adapte mejor la carta."
							value={field.state.value}
						/>
						<FieldDescription>Opcional. Ayuda a alinear tus logros a lo que el puesto requiere.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Field name="resumeId">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-resume-id">CV a vincular</FieldLabel>
						<Select
							items={resumeOptions}
							onValueChange={(value) => field.handleChange(value ?? "")}
							value={field.state.value}
						>
							<SelectTrigger id="letters-resume-id">
								<SelectValue placeholder="Elige un CV" />
							</SelectTrigger>
							<SelectPopup alignItemWithTrigger={false}>
								{resumeOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
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
							items={languageOptions}
							onValueChange={(value) => {
								// Narrowing real con el schema en vez de castear lo que devuelva el Select.
								const parsed = coverLetterLanguageSchema.safeParse(value);
								field.handleChange(parsed.success ? parsed.data : "es");
							}}
							value={field.state.value}
						>
							<SelectTrigger id="letters-language">
								<SelectValue placeholder="Elige idioma" />
							</SelectTrigger>
							<SelectPopup alignItemWithTrigger={false}>
								{languageOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
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
