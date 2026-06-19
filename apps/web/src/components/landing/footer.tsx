"use client";

import { ArrowUpRightIcon, InstagramLogoIcon, LinkedinLogoIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "../ui/button";
import { FOOTER_COLUMNS } from "./data";

export const SOCIAL_LINKS = [
	{ href: "https://linkedin.com/company/assendia", Icon: LinkedinLogoIcon, label: "LinkedIn" },
	{ href: "https://www.instagram.com/statusunknown418/", Icon: InstagramLogoIcon, label: "Instagram" },
];

const LEGAL_LINKS = [
	{ href: "/policy", label: "Privacidad" },
	{ href: "/terms", label: "Términos" },
	{ href: "/data", label: "Tus datos" },
];

const EASE_OUT_QUINT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingFooter() {
	const reduced = useReducedMotion();

	return (
		<footer className="relative mt-16 overflow-hidden">
			{/* Hairline accent above the signature, like a printer's mark */}
			<div aria-hidden="true" className="absolute top-0 left-1/2 h-px w-24 -translate-x-1/2 bg-oxblood/60" />

			<div className="mx-auto max-w-7xl px-6 pt-16 pb-10 md:pt-20">
				{/* SIGNATURE — giant ASSENDIA wordmark, static */}
				<SignatureMark />

				{/* Editorial tagline above the columns */}
				<motion.p
					className="mt-4 font-display-italic font-light text-[clamp(1.25rem,2.2vw,1.75rem)] text-muted-foreground leading-tight tracking-tight"
					initial={reduced ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
					transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.15 }}
					viewport={{ once: true, margin: "-10% 0px" }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
				>
					<span className="block text-center text-foreground">De donde estás, a donde quieres llegar.</span>
				</motion.p>

				{/* COLUMNS */}
				<motion.div
					className="mt-12 grid grid-cols-2 gap-x-8 gap-y-12 border-border border-t pt-12 md:mt-16 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:pt-14"
					initial={reduced ? false : { opacity: 0, y: 24 }}
					transition={{ duration: 0.7, ease: EASE_OUT_QUINT, delay: 0.2 }}
					viewport={{ once: true, margin: "-5% 0px" }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
				>
					<div className="col-span-2 md:col-span-1">
						<a className="group/brand inline-flex items-center gap-2" href="#top">
							<img
								alt="ASSENDIA"
								className="size-9 rounded-lg object-cover transition-transform duration-300 ease-out group-hover/brand:-rotate-3 group-hover/brand:scale-105"
								height={36}
								src="/assendia-logo.png"
								width={36}
							/>
							<span className="font-bold font-display text-2xl text-foreground tracking-tight">ASSENDIA</span>
						</a>
						<p className="mt-4 max-w-75 text-foreground/70 text-sm leading-relaxed">
							Score CV, IA y coaching humano en una sola suscripción. Hecho en Perú para LATAM.
						</p>
					</div>

					{FOOTER_COLUMNS.map((col, colIdx) => (
						<FooterColumn col={col} colIdx={colIdx} key={col.heading} />
					))}
				</motion.div>

				{/* LEGAL ROW */}
				<div className="mt-14 flex flex-col-reverse items-start justify-between gap-7 border-border border-t pt-7 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
						<p className="font-mono text-foreground/65 text-xs">
							Assendia.com, un producto de ©{" "}
							<Button
								// biome-ignore lint/a11y/useAnchorContent: external nav
								render={<a href="https://stackkstudios.com" rel="noopener" target="_blank" />}
								size="sm"
								variant="link"
							>
								Stackk Studios
							</Button>
						</p>
						<LegalDot />
						<ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
							{LEGAL_LINKS.map((link, idx) => (
								<li className="flex items-center gap-3" key={link.href}>
									<a
										className="group/legal relative font-mono text-foreground/65 text-xs uppercase transition-colors duration-200 hover:text-foreground"
										href={link.href}
									>
										{link.label}
										<span
											aria-hidden="true"
											className="absolute right-0 -bottom-0.5 left-0 h-px origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover/legal:scale-x-100"
										/>
									</a>
									{idx < LEGAL_LINKS.length - 1 && (
										<span aria-hidden="true" className="text-foreground/25">
											/
										</span>
									)}
								</li>
							))}
						</ul>
					</div>

					<ul className="flex items-center gap-1.5">
						{SOCIAL_LINKS.map((social, i) => (
							<SocialIcon delay={0.4 + i * 0.06} key={social.label} social={social} />
						))}
					</ul>
				</div>
			</div>
		</footer>
	);
}

function SignatureMark() {
	return (
		<div className="relative">
			<div className="flex items-center justify-between gap-4">
				<span className="font-mono text-foreground/55 text-xs uppercase">Tu carrera, en serio.</span>
				<span className="font-mono text-foreground/55 text-xs uppercase tabular-nums">Est. 2026 · Perú</span>
			</div>

			<div className="relative mt-2 flex w-full items-end justify-center leading-none">
				<span
					aria-hidden="true"
					className="block w-full bg-linear-to-t from-primary bg-clip-text text-center font-bold font-display text-[clamp(3.5rem,18vw,15rem)] text-foreground text-transparent leading-none tracking-tighter"
				>
					ASSENDIA
				</span>
			</div>
		</div>
	);
}

interface FooterColumnProps {
	col: (typeof FOOTER_COLUMNS)[number];
	colIdx: number;
}

function FooterColumn({ col, colIdx }: FooterColumnProps) {
	const reduced = useReducedMotion();
	return (
		<motion.div
			initial={reduced ? false : { opacity: 0, y: 16 }}
			transition={{ duration: 0.6, ease: EASE_OUT_QUINT, delay: 0.25 + colIdx * 0.06 }}
			viewport={{ once: true, margin: "-5% 0px" }}
			whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
		>
			<h2 className="mb-5 font-mono text-foreground/75 text-xs uppercase">{col.heading}</h2>
			<ul className="flex flex-col gap-2.5">
				{col.links.map((link) => (
					<li key={link.label}>
						<a
							className="group/link relative inline-flex items-center gap-1.5 text-foreground/75 text-sm transition-colors duration-200 hover:text-foreground"
							href={link.href}
						>
							<span className="relative">
								{link.label}
								<span
									aria-hidden="true"
									className="absolute right-0 -bottom-0.5 left-0 h-px origin-left scale-x-0 bg-oxblood transition-transform duration-300 ease-out group-hover/link:scale-x-100"
								/>
							</span>
							<ArrowUpRightIcon
								className="size-3 shrink-0 translate-x-0 -translate-y-0.5 opacity-0 transition-all duration-300 ease-out group-hover/link:translate-x-0.5 group-hover/link:opacity-70"
								weight="bold"
							/>
						</a>
					</li>
				))}
			</ul>
		</motion.div>
	);
}

function LegalDot() {
	return <span aria-hidden="true" className="size-[3px] rounded-full bg-foreground/25" />;
}

interface SocialIconProps {
	delay: number;
	social: (typeof SOCIAL_LINKS)[number];
}

function SocialIcon({ delay, social }: SocialIconProps) {
	const reduced = useReducedMotion();
	return (
		<motion.li
			initial={reduced ? false : { opacity: 0, scale: 0.85 }}
			transition={{ duration: 0.5, ease: EASE_OUT_QUINT, delay }}
			viewport={{ once: true }}
			whileInView={reduced ? undefined : { opacity: 1, scale: 1 }}
		>
			<a
				aria-label={social.label}
				className="group/social grid size-9 place-items-center rounded-full border border-border text-foreground/65 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-oxblood/55 hover:bg-oxblood/10 hover:text-foreground"
				href={social.href}
				rel="noopener noreferrer"
				target="_blank"
			>
				<social.Icon
					className="transition-transform duration-300 ease-out group-hover/social:scale-110"
					size={15}
					weight="duotone"
				/>
			</a>
		</motion.li>
	);
}
