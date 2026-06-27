"use client";

import { ArrowClockwiseIcon, TargetIcon } from "@phosphor-icons/react";
import { usePostHog } from "@posthog/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import type { CoverLetterLanguage, CoverLetterTemplateName } from "@stackk-career/schemas/api/letters";
import {
	coverLetterLanguageSchema,
	createCoverLetterGenerationInputSchema,
	DEFAULT_TEMPLATE,
	TEMPLATE_OPTIONS,
} from "@stackk-career/schemas/api/letters";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";
import { TemplatePicker } from "./template-card";

interface LettersCreateFormProps {
	onClose: () => void;
}

type JobTargetStatus = AppRouterOutputs["resumes"]["list"][number]["jobTargetStatus"];
type JobTarget = NonNullable<AppRouterOutputs["resumes"]["getJobTarget"]>;

const JOB_POSITION_MAX = 500;
const JOB_DESCRIPTION_MAX = 5000;
const MAX_TARGET_CHIPS = 8;

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

/** Cheap status pill shown next to each CV in the selector. */
function JobTargetStatusBadge({ status }: { status: JobTargetStatus }): React.ReactElement | null {
	if (status === "ready") {
		return (
			<Badge size="sm" variant="success">
				Oferta lista
			</Badge>
		);
	}
	if (status === "pending" || status === "fetching") {
		return (
			<Badge size="sm" variant="secondary">
				Leyendo oferta…
			</Badge>
		);
	}
	return null;
}

/** Read-only card describing the resume's READY job target, with an escape to manual entry. */
function SelectedTargetCard({
	onUseManual,
	target,
}: {
	onUseManual: () => void;
	target: JobTarget;
}): React.ReactElement {
	const meta = [target.location, target.seniority, target.employmentType].filter((value): value is string =>
		Boolean(value)
	);
	const chips = [...(target.structured?.skills ?? []), ...(target.structured?.keywords ?? [])].slice(
		0,
		MAX_TARGET_CHIPS
	);

	return (
		<Field>
			<p className="font-medium text-foreground text-sm">Oferta vinculada a este CV</p>
			<div className="flex w-full flex-col gap-3 rounded-lg border bg-card px-3 py-3 text-sm">
				<div className="flex gap-2.5">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success-foreground">
						<TargetIcon className="size-4" weight="duotone" />
					</span>
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="text-muted-foreground text-xs">CASEY adaptará la carta a esta oferta</span>
						<span className="text-foreground leading-snug">
							{target.title}
							{target.company ? <span className="text-muted-foreground"> @ {target.company}</span> : null}
						</span>
					</div>
				</div>
				{meta.length > 0 && (
					<ul className="flex flex-wrap gap-1.5">
						{meta.map((value) => (
							<li key={value}>
								<Badge size="sm" variant="secondary">
									{value}
								</Badge>
							</li>
						))}
					</ul>
				)}
				{chips.length > 0 && (
					<ul className="flex flex-wrap gap-1.5">
						{chips.map((chip) => (
							<li key={chip}>
								<Badge className="font-normal text-muted-foreground" size="sm" variant="outline">
									{chip}
								</Badge>
							</li>
						))}
					</ul>
				)}
			</div>
			<Button onClick={onUseManual} size="xs" type="button" variant="outline">
				<ArrowClockwiseIcon />
				Utlizar otro puesto
			</Button>
			<FieldDescription>Reutilizamos la oferta de LinkedIn de este CV. No necesitas pegar nada.</FieldDescription>
		</Field>
	);
}

/** Shown while the selected CV's target is still being fetched/normalized. */
function TargetLoadingState({ onUseManual }: { onUseManual: () => void }): React.ReactElement {
	return (
		<Field>
			<p className="font-medium text-foreground text-sm">Oferta del CV</p>
			<div className="flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-muted-foreground text-sm">
				<Loader centered={false} />
				<span>Estamos leyendo la oferta de este CV…</span>
			</div>
			<Button onClick={onUseManual} size="sm" type="button" variant="link">
				Escribir el puesto manualmente
			</Button>
			<FieldDescription>Crea la carta con la oferta apenas terminemos, o escribe el puesto a mano.</FieldDescription>
		</Field>
	);
}

/**
 * /letters dialog body. Picks the linked CV first, then derives the job context:
 *
 * - If the selected CV has a READY job target, the form reuses it (`source:
 *   "resume-job-target"`) and shows a read-only target card — no job text typed.
 * - If the target is still being fetched, it shows loading copy with an escape to
 *   manual entry.
 * - Otherwise (no/failed target, or the user opts out) it shows the manual
 *   job-position/description fields (`source: "manual"`).
 *
 * Pattern mirrors resume-create-form: bare TanStack `useForm` + a `useMutation`,
 * cache-invalidation on success, navigate to the detail route. The CV list is
 * populated from `orpc.resumes.list` via Suspense; the selected CV's target is
 * fetched on demand from `orpc.resumes.getJobTarget`.
 */
export function LettersCreateForm({ onClose }: LettersCreateFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const { data: resumes } = useSuspenseQuery(orpc.resumes.list.queryOptions());

	const [manualOverrideFor, setManualOverrideFor] = useState<string | null>(null);

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
				posthog?.capture("cover_letter_created", { generationId });
				onClose();
				navigate({ params: { generationId }, to: "/dash/letters/$generationId" });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	// Typing the object (instead of casting) lets useForm infer the unions without
	// type assertions. `source` is kept in form state so field validation + the
	// submit payload follow the mode the user actually sees.
	const defaultValues: {
		jobPosition: string;
		jobDescription: string;
		language: CoverLetterLanguage;
		resumeId: string;
		source: "manual" | "resume-job-target";
		template: CoverLetterTemplateName;
	} = {
		jobPosition: "",
		jobDescription: "",
		language: "es",
		resumeId: resumes[0]?.id ?? "",
		source: "manual",
		template: TEMPLATE_OPTIONS[0]?.value ?? DEFAULT_TEMPLATE,
	};

	const form = useForm({
		defaultValues,
		onSubmit: ({ value }) => {
			const payload =
				value.source === "resume-job-target"
					? {
							language: value.language,
							resumeId: value.resumeId,
							source: "resume-job-target" as const,
							template: value.template,
						}
					: {
							jobDescription: value.jobDescription.trim() || undefined,
							jobPosition: value.jobPosition,
							language: value.language,
							resumeId: value.resumeId,
							source: "manual" as const,
							template: value.template,
						};
			// Fields are validated inline; safeParse trims + applies the schema's
			// transforms before the mutation (and guards the union shape).
			const parsed = createCoverLetterGenerationInputSchema.safeParse(payload);
			if (parsed.success) {
				createMutation.mutate(parsed.data);
			}
		},
	});

	const selectedResumeId = useStore(form.store, (state) => state.values.resumeId);

	const jobTargetQuery = useQuery(
		orpc.resumes.getJobTarget.queryOptions({
			enabled: Boolean(selectedResumeId),
			input: { resumeId: selectedResumeId },
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				return status === "pending" || status === "fetching" ? 4000 : false;
			},
		})
	);

	const target = jobTargetQuery.data ?? undefined;
	const targetStatus = target?.status;
	const hasReadyTarget = targetStatus === "ready" && Boolean(target?.title);
	const isTargetPending = targetStatus === "pending" || targetStatus === "fetching";
	const isResolvingTarget = jobTargetQuery.isLoading && Boolean(selectedResumeId);
	// The user opted into manual entry for THIS CV; switching CVs implicitly reverts
	// to reusing the new CV's stored target.
	const manualOverride = manualOverrideFor === selectedResumeId;

	const useTarget = hasReadyTarget && !manualOverride;
	const showLoading = !manualOverride && (isResolvingTarget || isTargetPending);
	const showManual = !(useTarget || showLoading);

	// Keep the form `source` in sync with the derived mode so validation and the
	// submit payload follow what the user sees.
	useEffect(() => {
		form.setFieldValue("source", useTarget ? "resume-job-target" : "manual");
	}, [useTarget, form]);

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
			<form.Field name="template">
				{(field) => (
					<Field>
						<FieldLabel htmlFor="letters-template">Estilo de la carta</FieldLabel>
						<TemplatePicker id="letters-template" onValueChange={field.handleChange} value={field.state.value} />
					</Field>
				)}
			</form.Field>

			<form.Field
				name="resumeId"
				validators={{ onChange: ({ value }) => (value ? undefined : "Selecciona un CV a vincular.") }}
			>
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
								{resumes.map((resume) => (
									<SelectItem key={resume.id} value={resume.id}>
										<span className="flex items-center gap-2">
											<span className="truncate">{resume.title ?? "CV sin título"}</span>
											<JobTargetStatusBadge status={resume.jobTargetStatus} />
										</span>
									</SelectItem>
								))}
							</SelectPopup>
						</Select>
						<FieldErrorText errors={field.state.meta.errors} />
						<FieldDescription>CASEY tomará tu experiencia y skills de este CV.</FieldDescription>
					</Field>
				)}
			</form.Field>

			{useTarget && target ? (
				<SelectedTargetCard onUseManual={() => setManualOverrideFor(selectedResumeId)} target={target} />
			) : null}

			{showLoading ? <TargetLoadingState onUseManual={() => setManualOverrideFor(selectedResumeId)} /> : null}

			{showManual ? (
				<>
					<form.Field
						name="jobPosition"
						validators={{
							onChange: ({ value, fieldApi }) =>
								fieldApi.form.state.values.source === "resume-job-target" ? undefined : validateJobPosition(value),
						}}
					>
						{(field) => (
							<Field>
								<FieldLabel htmlFor="letters-job-position">Puesto al que postulas</FieldLabel>
								<Input
									aria-invalid={field.state.meta.errors.length > 0}
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

					<form.Field
						name="jobDescription"
						validators={{
							onChange: ({ value }) =>
								value.trim().length > JOB_DESCRIPTION_MAX ? `Usa máximo ${JOB_DESCRIPTION_MAX} caracteres.` : undefined,
						}}
					>
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
				</>
			) : null}

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

			<form.Subscribe
				selector={(state) => ({
					isSubmitting: state.isSubmitting,
					jobPosition: state.values.jobPosition,
					resumeId: state.values.resumeId,
				})}
			>
				{({ isSubmitting, jobPosition, resumeId }) => {
					const missingManualPosition = showManual && validateJobPosition(jobPosition) !== undefined;
					const disabled =
						isSubmitting || createMutation.isPending || !resumeId || showLoading || missingManualPosition;
					return (
						<Button disabled={disabled} type="submit">
							{(isSubmitting || createMutation.isPending) && <Loader />}
							Crear carta
						</Button>
					);
				}}
			</form.Subscribe>
		</form>
	);
}
