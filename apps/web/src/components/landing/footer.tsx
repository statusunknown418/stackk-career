"use client";

import {
	ArrowUpRightIcon,
	InstagramLogoIcon,
	LinkedinLogoIcon,
	ShieldCheckIcon,
	WhatsappLogoIcon,
	XLogoIcon,
} from "@phosphor-icons/react";
import { type MotionValue, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { FOOTER_COLUMNS } from "./data";

const SOCIAL_LINKS = [
	{ href: "https://wa.me/51999999999", Icon: WhatsappLogoIcon, label: "WhatsApp" },
	{ href: "https://linkedin.com/company/assendia", Icon: LinkedinLogoIcon, label: "LinkedIn" },
	{ href: "https://instagram.com/assendia", Icon: InstagramLogoIcon, label: "Instagram" },
	{ href: "https://x.com/assendia", Icon: XLogoIcon, label: "X" },
];

const LEGAL_LINKS = [
	{ href: "/privacy", label: "Privacidad" },
	{ href: "/terms", label: "Términos" },
	{ href: "/data", label: "Tus datos" },
];

const EASE_OUT_QUINT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LandingFooter() {
	const footerRef = useRef<HTMLElement>(null);
	const reduced = useReducedMotion();

	const { scrollYProgress } = useScroll({
		target: footerRef,
		offset: ["start end", "end end"],
	});

	// Signature wordmark scrubs: starts compressed and faded, settles bold + sharp.
	// Smooth the wordmark's wheel-jitter so the 42px translate doesn't shudder.
	const smoothScroll = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.3 });
	const markScale = useTransform(smoothScroll, [0, 0.55], [0.92, 1]);
	const markOpacity = useTransform(smoothScroll, [0, 0.4, 0.9], [0.15, 1, 1]);
	const markY = useTransform(smoothScroll, [0, 0.55], [42, 0]);
	const dotScale = useTransform(smoothScroll, [0.45, 0.85], [0.85, 1]);

	return (
		<footer className="relative mt-16 overflow-hidden border-border border-t bg-foreground/[0.015]" ref={footerRef}>
			{/* Hairline accent above the signature, like a printer's mark */}
			<div aria-hidden="true" className="absolute top-0 left-1/2 h-px w-24 -translate-x-1/2 bg-oxblood/60" />

			<div className="mx-auto max-w-[1200px] px-6 pt-16 pb-10 md:pt-20">
				{/* SIGNATURE — giant ASSENDIA wordmark, scroll-scrubbed */}
				<SignatureMark dotScale={dotScale} markOpacity={markOpacity} markScale={markScale} markY={markY} />

				{/* Editorial tagline above the columns */}
				<motion.p
					className="mt-10 max-w-[640px] font-display-italic font-light text-[clamp(1.25rem,2.2vw,1.75rem)] text-foreground/80 leading-[1.25] tracking-[-0.018em] md:mt-14"
					initial={reduced ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
					transition={{ duration: 0.8, ease: EASE_OUT_QUINT, delay: 0.15 }}
					viewport={{ once: true, margin: "-10% 0px" }}
					whileInView={reduced ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
				>
					Hecho en Lima. Pensado para LATAM.{" "}
					<span className="text-foreground">Tu próxima entrevista no se espera, se construye.</span>
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
							<span className="font-bold font-display text-2xl text-foreground tracking-[-0.02em]">ASSENDIA</span>
						</a>
						<p className="mt-4 max-w-[300px] text-[14px] text-foreground/70 leading-[1.6]">
							Score CV, IA y coaching humano en una sola suscripción. Hecho en Perú para LATAM.
						</p>
						<div className="mt-5 inline-flex items-center gap-2 font-mono text-[10.5px] text-foreground/60 uppercase tracking-[0.18em]">
							<span aria-hidden="true" className="size-1 rounded-full bg-oxblood" />
							Lima · Bogotá · CDMX
						</div>
					</div>

					{FOOTER_COLUMNS.map((col, colIdx) => (
						<FooterColumn col={col} colIdx={colIdx} key={col.heading} />
					))}
				</motion.div>

				{/* LEGAL ROW */}
				<div className="mt-14 flex flex-col-reverse items-start justify-between gap-7 border-border border-t pt-7 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
						<p className="font-mono text-[11px] text-foreground/65 uppercase tracking-[0.14em]">© 2026 ASSENDIA SAC</p>
						<LegalDot />
						<ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
							{LEGAL_LINKS.map((link, idx) => (
								<li className="flex items-center gap-3" key={link.href}>
									<a
										className="group/legal relative font-mono text-[11px] text-foreground/65 uppercase tracking-[0.14em] transition-colors duration-200 hover:text-foreground"
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
						<LegalDot />
						<DataProtectionPill />
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

interface SignatureMarkProps {
	dotScale: MotionValue<number>;
	markOpacity: MotionValue<number>;
	markScale: MotionValue<number>;
	markY: MotionValue<number>;
}

function SignatureMark({ dotScale, markOpacity, markScale, markY }: SignatureMarkProps) {
	const reduced = useReducedMotion();

	return (
		<div className="relative">
			<div className="flex items-center justify-between gap-4">
				<span className="font-mono text-[10.5px] text-foreground/55 uppercase tracking-[0.22em]">
					Tu carrera, en serio.
				</span>
				<span className="font-mono text-[10.5px] text-foreground/55 uppercase tabular-nums tracking-[0.22em]">
					Est. 2026 · Perú
				</span>
			</div>

			<motion.div
				className="relative mt-2 flex w-full items-end justify-center leading-none"
				style={
					reduced
						? undefined
						: {
								scale: markScale,
								opacity: markOpacity,
								y: markY,
								transformOrigin: "center bottom",
							}
				}
			>
				<span
					aria-hidden="true"
					className="block w-full text-center font-bold font-display text-[clamp(4.5rem,18vw,17rem)] text-foreground leading-[0.85] tracking-[-0.06em]"
				>
					ASSENDIA
				</span>
				{/* Green dot — printer's signature */}
				<motion.span
					aria-hidden="true"
					className="absolute right-[2%] bottom-0 size-[clamp(0.5rem,1.4vw,1.1rem)] -translate-y-[10%] rounded-full bg-oxblood shadow-[0_0_24px_oklch(from_var(--oxblood)_l_c_h/0.65)]"
					style={reduced ? undefined : { scale: dotScale }}
				/>
			</motion.div>
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
			<h2 className="mb-5 font-mono text-[10px] text-foreground/75 uppercase tracking-[0.22em]">{col.heading}</h2>
			<ul className="flex flex-col gap-2.5">
				{col.links.map((link) => (
					<li key={link.label}>
						<a
							className="group/link relative inline-flex items-center gap-1.5 text-[14px] text-foreground/75 transition-colors duration-200 hover:text-foreground"
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

function DataProtectionPill() {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-oxblood/35 bg-oxblood/10 px-2.5 py-1 font-mono text-[10.5px] text-foreground/85 uppercase tracking-[0.14em]">
			<ShieldCheckIcon className="text-oxblood" size={11} weight="fill" />
			Datos protegidos · Ley 29733 PE
		</span>
	);
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
