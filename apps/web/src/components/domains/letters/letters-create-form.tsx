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

const JOB_POSITION_MAX = 500;
const JOB_DESCRIPTION_MAX = 5000;

const validateJobPosition = (value: string): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return "Indica el puesto al que vas a postular.";
	}
	if (trimmed.length > JOB_POSITION_MAX) {
		return `Usa máximo ${JOB_POSITION_MAX} caracteres.`;
	}
	return;
};

const validateJobDescription = (value: string): string | undefined =>
	value.trim().length > JOB_DESCRIPTION_MAX ? `Usa máximo ${JOB_DESCRIPTION_MAX} caracteres.` : undefined;

const validateResumeId = (value: string): string | undefined => (value ? undefined : "Selecciona un CV a vincular.");

function FieldErrorText({ errors }: { errors: readonly unknown[] }): React.ReactElement | null {
	const message = errors.filter(Boolean).join(", ");
	if (!message) {
		return null;
	}
	return (
		<p className="text-destructive-foreground text-xs" role="alert">
			{message}
		</p>
	);
}

/**
 * /letters dialog body. Two fields, one mutation.
 *
 * Pattern mirrors resume-create-form: bare TanStack `useForm` + a `useMutation`,
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

	// Typing the object (instead of casting `language`) lets useForm infer the union
	// without type assertions.
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
			// Fields are validated inline, so a passing submit always parses; safeParse
			// is kept only to trim + apply the schema's transforms before the mutation.
			const parsed = createCoverLetterGenerationInputSchema.safeParse(value);
			if (parsed.success) {
				createMutation.mutate(parsed.data);
			}
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
			<form.Field name="jobPosition" validators={{ onChange: ({ value }) => validateJobPosition(value) }}>
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-job-position">Puesto al que postulas</FieldLabel>
						<Input
							aria-invalid={field.state.meta.errors.length > 0}
							autoFocus
							disabled={createMutation.isPending}
							id="letters-job-position"
							maxLength={JOB_POSITION_MAX}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Ej. Senior Product Manager en Yape"
							value={field.state.value}
						/>
						<FieldErrorText errors={field.state.meta.errors} />
						<FieldDescription>Sé específico: empresa + rol ayuda a CASEY a redactar mejor.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Field name="jobDescription" validators={{ onChange: ({ value }) => validateJobDescription(value) }}>
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-job-description">Descripción del puesto</FieldLabel>
						<Textarea
							aria-invalid={field.state.meta.errors.length > 0}
							disabled={createMutation.isPending}
							id="letters-job-description"
							maxLength={JOB_DESCRIPTION_MAX}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							placeholder="Pega aquí la descripción del puesto o contexto de la oferta de trabajo para que CASEY adapte mejor la carta."
							value={field.state.value}
						/>
						<FieldErrorText errors={field.state.meta.errors} />
						<FieldDescription>Opcional. Ayuda a alinear tus logros a lo que el puesto requiere.</FieldDescription>
					</Field>
				)}
			</form.Field>

			<form.Field name="resumeId" validators={{ onChange: ({ value }) => validateResumeId(value) }}>
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-resume-id">CV a vincular</FieldLabel>
						<Select
							items={resumeOptions}
							onValueChange={(value) => field.handleChange(value ?? "")}
							value={field.state.value}
						>
							<SelectTrigger aria-invalid={field.state.meta.errors.length > 0} id="letters-resume-id">
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
						<FieldErrorText errors={field.state.meta.errors} />
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
								// Real narrowing via the schema instead of casting the Select value.
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

			<form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
				{({ canSubmit, isSubmitting }) => (
					<Button disabled={!canSubmit || isSubmitting || createMutation.isPending} type="submit">
						{(isSubmitting || createMutation.isPending) && <Loader />}
						Crear carta
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
