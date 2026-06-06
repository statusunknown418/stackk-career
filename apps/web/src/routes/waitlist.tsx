import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { SOCIAL_LINKS } from "@/components/landing/footer";

const TITLE = "Muy pronto · ASSENDIA";
const DESCRIPTION =
	"Muy pronto: un Agente de IA que analiza y potencia tu CV para tu próxima entrevista. Síguenos para enterarte del lanzamiento.";

export const Route = createFileRoute("/waitlist")({
	component: ComingSoonPage,
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			// Placeholder page — keep it out of search results while we build.
			{ name: "robots", content: "noindex, follow" },
			{ name: "theme-color", content: "#0a0a0a" },
		],
	}),
});

function ComingSoonPage() {
	const motionDisabled = useReducedMotion() ?? false;

	return (
		<main className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-20 text-center">
			{/* Soft oxblood glow, in keeping with the landing's mesh hero */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_30%,oklch(0.72_0.19_150_/_0.12),transparent_70%)]"
			/>

			<Link className="group flex items-center gap-2 text-foreground tracking-tight" to="/">
				<img
					alt="ASSENDIA"
					className="size-9 rounded-lg object-cover"
					height={36}
					src="/assendia-logo.png"
					width={36}
				/>
				<span className="font-bold font-display text-lg leading-none tracking-tight">ASSENDIA</span>
			</Link>

			{/* Alive but tasteful: a periodic sheen, no harsh "live" ping or status dot. */}
			<span className="relative mt-12 inline-flex items-center overflow-hidden rounded-full border border-oxblood/30 bg-card px-3 py-1 font-medium font-mono text-foreground/75 text-xs uppercase tracking-widest shadow-[0_0_0_1px_oklch(0.72_0.19_150_/_0.04),0_8px_24px_-12px_oklch(0.72_0.19_150_/_0.25)]">
				Muy pronto
				{!motionDisabled && (
					<motion.span
						animate={{ x: ["-160%", "460%"] }}
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-oxblood/15 to-transparent"
						transition={{ duration: 2.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY, repeatDelay: 2 }}
					/>
				)}
			</span>

			<h1 className="mt-7 max-w-[16ch] font-display font-semibold text-[clamp(2.25rem,6vw,4rem)] text-foreground leading-[1.02] tracking-tighter">
				Estamos afinando los últimos detalles
			</h1>

			<p className="mt-6 max-w-[52ch] text-[clamp(1rem,1.2vw,1.15rem)] text-foreground/70 leading-normal">
				Muy pronto, un Agente especializado de IA analizará y potenciará tu CV, y un coach 1:1 que ya pasó por lo mismo
				te acompañará hasta tu próxima entrevista.
			</p>

			<p className="mt-12 font-medium text-foreground/80 text-sm">
				Síguenos y sé el primero en enterarte del lanzamiento.
			</p>

			<div className="mt-4 flex flex-wrap items-center justify-center gap-3">
				{SOCIAL_LINKS.map(({ href, Icon, label }) => (
					<a
						className="group/social inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 font-medium text-foreground/80 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-oxblood/55 hover:bg-oxblood/10 hover:text-foreground"
						href={href}
						key={label}
						rel="noopener noreferrer"
						target="_blank"
					>
						<Icon className="transition-transform duration-200 group-hover/social:scale-110" size={18} weight="bold" />
						{label}
					</a>
				))}
			</div>

			<Link
				className="group mt-14 inline-flex items-center gap-2 font-medium text-foreground/55 text-sm transition-colors hover:text-foreground"
				to="/"
			>
				<ArrowLeftIcon
					className="transition-transform duration-200 group-hover:-translate-x-0.5"
					size={15}
					weight="bold"
				/>
				Volver al inicio
			</Link>
		</main>
	);
}
