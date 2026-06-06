import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { SOCIAL_LINKS } from "@/components/landing/footer";

const TITLE = "Muy pronto · ASSENDIA";
const DESCRIPTION =
	"Muy pronto: un Agente de IA que analiza y potencia tu CV para tu próxima entrevista. Síguenos para enterarte del lanzamiento.";

export const Route = createFileRoute("/muy-pronto")({
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
	return (
		<main className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-20 text-center">
			{/* Soft oxblood glow, in keeping with the landing's mesh hero */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_30%,oklch(0.72_0.19_150_/_0.12),transparent_70%)]"
			/>

			<a className="group flex items-center gap-2 text-foreground tracking-tight" href="/">
				<img
					alt="ASSENDIA"
					className="size-9 rounded-lg object-cover"
					height={36}
					src="/assendia-logo.png"
					width={36}
				/>
				<span className="font-bold font-display text-lg leading-none tracking-tight">ASSENDIA</span>
			</a>

			<span className="mt-12 inline-flex items-center gap-2 rounded-full border border-oxblood/30 bg-oxblood/10 px-3 py-1 font-medium font-mono text-oxblood text-xs uppercase tracking-widest">
				<span aria-hidden="true" className="relative grid size-2 place-items-center">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-oxblood/40" />
					<span className="relative size-2 rounded-full bg-oxblood" />
				</span>
				Muy pronto
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

			<a
				className="group mt-14 inline-flex items-center gap-2 font-medium text-foreground/55 text-sm transition-colors hover:text-foreground"
				href="/"
			>
				<ArrowLeftIcon
					className="transition-transform duration-200 group-hover:-translate-x-0.5"
					size={15}
					weight="bold"
				/>
				Volver al inicio
			</a>
		</main>
	);
}
