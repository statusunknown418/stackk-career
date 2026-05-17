import {
	InstagramLogoIcon,
	LinkedinLogoIcon,
	ShieldCheckIcon,
	WhatsappLogoIcon,
	XLogoIcon,
} from "@phosphor-icons/react";
import { FOOTER_COLUMNS } from "./data";

const SOCIAL_LINKS = [
	{ href: "https://wa.me/51999999999", Icon: WhatsappLogoIcon, label: "WhatsApp" },
	{ href: "https://linkedin.com/company/impulsa", Icon: LinkedinLogoIcon, label: "LinkedIn" },
	{ href: "https://instagram.com/impulsa", Icon: InstagramLogoIcon, label: "Instagram" },
	{ href: "https://x.com/impulsa", Icon: XLogoIcon, label: "X" },
];

const LEGAL_LINKS = [
	{ href: "/privacy", label: "Privacidad" },
	{ href: "/terms", label: "Términos" },
	{ href: "/data", label: "Tus datos" },
];

export function LandingFooter() {
	return (
		<footer className="mt-12 border-foreground/10 border-t bg-foreground/[0.015]">
			<div className="mx-auto max-w-[1200px] px-6 pt-16 pb-10">
				<div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
					<div className="col-span-2 md:col-span-1">
						<div className="flex items-center gap-2">
							<span
								aria-hidden="true"
								className="grid size-9 place-items-center rounded-lg bg-foreground font-bold font-display text-[15px] text-background leading-none"
							>
								i
							</span>
							<span className="font-bold font-display text-2xl text-foreground tracking-[-0.02em]">IMPULSA</span>
						</div>
						<p className="mt-4 max-w-[300px] text-[14px] text-foreground/70 leading-[1.55]">
							Tu próxima entrevista empieza con un score. IA + coach humano, hecho en Perú para LATAM.
						</p>
					</div>

					{FOOTER_COLUMNS.map((col) => (
						<div key={col.heading}>
							<h2 className="mb-5 font-mono text-[10px] text-foreground/75 uppercase tracking-[0.18em]">
								{col.heading}
							</h2>
							<ul className="flex flex-col gap-2.5">
								{col.links.map((link) => (
									<li key={link.label}>
										<a
											className="text-[14px] text-foreground/75 transition-colors hover:text-foreground"
											href={link.href}
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-14 flex flex-col-reverse items-start justify-between gap-6 border-foreground/10 border-t pt-7 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<p className="text-foreground/70 text-xs">© 2026 IMPULSA · Lima · Bogotá · CDMX</p>
						<span aria-hidden="true" className="size-1 rounded-full bg-foreground/20" />
						<ul className="flex flex-wrap items-center gap-x-4">
							{LEGAL_LINKS.map((link) => (
								<li key={link.href}>
									<a
										className="text-[12px] text-foreground/75 transition-colors hover:text-foreground"
										href={link.href}
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
						<span aria-hidden="true" className="size-1 rounded-full bg-foreground/20" />
						<span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground/70 uppercase tracking-[0.12em]">
							<ShieldCheckIcon size={12} weight="bold" />
							Datos protegidos · Ley 29733 PE
						</span>
					</div>

					<ul className="flex items-center gap-1.5">
						{SOCIAL_LINKS.map((social) => (
							<li key={social.label}>
								<a
									aria-label={social.label}
									className="grid size-9 place-items-center rounded-full border border-foreground/10 text-foreground/65 transition-all hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
									href={social.href}
									rel="noopener noreferrer"
									target="_blank"
								>
									<social.Icon size={15} weight="duotone" />
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>
		</footer>
	);
}
