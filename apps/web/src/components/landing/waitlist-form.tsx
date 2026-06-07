"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orpc } from "@/utils/orpc";

/** Captura de waitlist en /waitlist: teléfono (WhatsApp) + nombre + email para avisar al lanzar. */
export function WaitlistForm() {
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");

	const join = useMutation(
		orpc.waitlist.join.mutationOptions({
			onError: (error) => toast.error(error.message),
		})
	);

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
			className="mt-10 flex w-full max-w-sm flex-col gap-2.5 text-left"
			onSubmit={(event) => {
				event.preventDefault();
				join.mutate({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined });
			}}
		>
			<Input
				autoComplete="name"
				disabled={join.isPending}
				onChange={(event) => setName(event.target.value)}
				placeholder="Tu nombre"
				required
				value={name}
			/>
			<Input
				autoComplete="tel"
				disabled={join.isPending}
				inputMode="tel"
				onChange={(event) => setPhone(event.target.value)}
				placeholder="Tu celular (WhatsApp)"
				required
				type="tel"
				value={phone}
			/>
			<Input
				autoComplete="email"
				disabled={join.isPending}
				onChange={(event) => setEmail(event.target.value)}
				placeholder="Tu correo (opcional)"
				type="email"
				value={email}
			/>
			<Button className="mt-1 w-full" disabled={join.isPending} size="lg" type="submit">
				{join.isPending ? "Enviando…" : "Avísame del lanzamiento"}
			</Button>
		</form>
	);
}
