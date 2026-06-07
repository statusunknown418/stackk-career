"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { joinWaitlistInputSchema } from "@stackk-career/schemas/api/waitlist";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

const emailFieldValidator = ({ value }: { value: string }): string | undefined => {
	const trimmed = value.trim();
	if (!trimmed) {
		return; // opcional
	}
	return z.email().safeParse(trimmed).success ? undefined : "Correo inválido";
};

function FieldErrorText({ errors }: { errors: unknown[] }) {
	const message = errors
		.map((error) => (typeof error === "string" ? error : (error as { message?: string } | null)?.message))
		.find(Boolean);
	return message ? <p className="px-1 text-destructive text-xs">{message}</p> : null;
}

/** Captura de waitlist en /waitlist: nombre + teléfono (WhatsApp) + email para avisar al lanzar. */
export function WaitlistForm() {
	const join = useMutation(
		orpc.waitlist.join.mutationOptions({
			onError: (error) => toast.error(error.message),
		})
	);

	const form = useForm({
		defaultValues: { name: "", phone: "", email: "" },
		onSubmit: ({ value }) => {
			join.mutate({
				name: value.name.trim(),
				phone: value.phone.trim(),
				email: value.email.trim() || undefined,
			});
		},
	});

	if (join.isSuccess) {
		return (
			<div className="mt-10 flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border border-oxblood/30 bg-oxblood/10 px-6 py-8 text-center">
				<CheckCircleIcon className="text-oxblood" size={32} weight="fill" />
				<p className="font-medium text-foreground">¡Listo! Estás en la lista.</p>
				<p className="text-foreground/70 text-sm">Te escribimos a tu WhatsApp apenas lancemos.</p>
			</div>
		);
	}

	return (
		<form
			className="mt-10 flex w-full max-w-sm flex-col gap-3 text-left"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.Field name="name" validators={{ onSubmit: joinWaitlistInputSchema.shape.name }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<Input
							aria-label="Tu nombre"
							autoComplete="name"
							disabled={join.isPending}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu nombre"
							value={field.state.value}
						/>
						<FieldErrorText errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field name="phone" validators={{ onSubmit: joinWaitlistInputSchema.shape.phone }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<Input
							aria-label="Tu celular (WhatsApp)"
							autoComplete="tel"
							disabled={join.isPending}
							inputMode="tel"
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu celular (WhatsApp)"
							type="tel"
							value={field.state.value}
						/>
						<FieldErrorText errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Field name="email" validators={{ onSubmit: emailFieldValidator }}>
				{(field) => (
					<div className="flex flex-col gap-1">
						<Input
							aria-label="Tu correo (opcional)"
							autoComplete="email"
							disabled={join.isPending}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							placeholder="Tu correo (opcional)"
							type="email"
							value={field.state.value}
						/>
						<FieldErrorText errors={field.state.meta.errors} />
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<Button className="mt-1 w-full" disabled={isSubmitting || join.isPending} size="lg" type="submit">
						{(isSubmitting || join.isPending) && <Loader />}
						Avísame del lanzamiento
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
