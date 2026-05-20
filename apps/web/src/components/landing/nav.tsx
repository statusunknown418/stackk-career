"use client";

import { ArrowRightIcon, ListIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/magnetic";
import { Sheet, SheetClose, SheetPanel, SheetPopup, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./data";

const SECTION_IDS = NAV_LINKS.map((link) => link.href.replace("#", ""));

export function LandingNav() {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [showCta, setShowCta] = useState(false);
	const { scrollYProgress } = useScroll();

	useEffect(() => {
		const onScroll = () => {
			setShowCta(window.scrollY > window.innerHeight * 0.6);
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
			(el): el is HTMLElement => el !== null
		);
		if (elements.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible[0]) {
					setActiveId(visible[0].target.id);
				}
			},
			{
				rootMargin: "-120px 0px -55% 0px",
				threshold: [0, 0.25, 0.5, 0.75, 1],
			}
		);

		for (const el of elements) {
			observer.observe(el);
		}
		return () => observer.disconnect();
	}, []);

	return (
		<>
			<motion.div
				aria-hidden="true"
				className="fixed top-0 right-0 left-0 z-[100] h-[2px] origin-left bg-oxblood"
				style={{ scaleX: scrollYProgress }}
			/>
			<header className="sticky top-4 z-50 mx-auto mt-4 w-full max-w-[1200px] px-4">
				<nav className="flex items-center gap-2 rounded-full border border-border bg-muted py-2 pr-2 pl-3 shadow-[var(--shadow-nav)] backdrop-blur-xl backdrop-saturate-150">
					<a className="flex shrink-0 items-center gap-2 pr-3 text-foreground tracking-tight" href="#top">
						<img
							alt="ASSENDIA"
							className="size-8 rounded-lg object-cover"
							height={32}
							src="/assendia-logo.png"
							width={32}
						/>
						<span className="font-bold font-display text-[1.05rem] leading-none tracking-[-0.02em]">ASSENDIA</span>
					</a>

					<span aria-hidden="true" className="hidden h-5 w-px bg-muted md:block" />

					<ul className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
						{NAV_LINKS.map((link) => {
							const id = link.href.replace("#", "");
							const isActive = activeId === id;
							return (
								<li className="relative" key={link.href}>
									<a
										aria-current={isActive ? "true" : undefined}
										className={cn(
											"relative inline-flex items-center rounded-full px-3 py-1.5 font-medium text-[13px] transition-colors",
											isActive ? "text-foreground" : "text-foreground/60 hover:bg-muted hover:text-foreground"
										)}
										href={link.href}
									>
										{link.label}
									</a>
								</li>
							);
						})}
					</ul>

					<span aria-hidden="true" className="hidden h-5 w-px bg-muted md:block" />

					<div className="ml-auto flex items-center gap-1.5 md:ml-0">
						<a
							className="hidden rounded-full px-3 py-1.5 font-medium text-[13px] text-foreground/65 transition-colors hover:text-foreground md:inline-flex"
							href="/login"
						>
							Iniciar sesión
						</a>
						<AnimatePresence initial={false}>
							{showCta && (
								<motion.span
									animate={{ opacity: 1, scale: 1, width: "auto" }}
									className="hidden overflow-hidden md:inline-flex"
									exit={{ opacity: 0, scale: 0.85, width: 0 }}
									initial={{ opacity: 0, scale: 0.85, width: 0 }}
									transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
								>
									<Magnetic radius={90} strength={0.22}>
										<a className={buttonVariants({ size: "sm" })} href="/setup">
											Analiza mi CV gratis
											<ArrowRightIcon weight="bold" />
										</a>
									</Magnetic>
								</motion.span>
							)}
						</AnimatePresence>
						<MobileMenu />
					</div>
				</nav>
			</header>
		</>
	);
}

function MobileMenu() {
	return (
		<Sheet>
			<SheetTrigger
				aria-label="Abrir menú"
				className="grid size-9 place-items-center rounded-full border border-border text-foreground/75 transition-colors hover:bg-muted hover:text-foreground md:hidden"
			>
				<ListIcon size={18} weight="bold" />
			</SheetTrigger>
			<SheetPopup className="w-[min(86vw,320px)]" side="right">
				<div className="flex items-center gap-2 px-6 pt-6">
					<img
						alt="ASSENDIA"
						className="size-8 rounded-lg object-cover"
						height={32}
						src="/assendia-logo.png"
						width={32}
					/>
					<span className="font-bold font-display text-[1.05rem] text-foreground leading-none tracking-[-0.02em]">
						ASSENDIA
					</span>
				</div>
				<SheetPanel>
					<ul className="mt-2 flex flex-col gap-1">
						{NAV_LINKS.map((link) => (
							<li key={link.href}>
								<SheetClose
									render={
										<a
											className="block rounded-lg px-3 py-2.5 font-medium text-[15px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
											href={link.href}
										>
											{link.label}
										</a>
									}
								/>
							</li>
						))}
					</ul>

					<div className="mt-6 flex flex-col gap-2 border-border border-t pt-6">
						<SheetClose
							render={
								<a
									className="rounded-lg px-3 py-2 font-medium text-[14px] text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
									href="/login"
								>
									Iniciar sesión
								</a>
							}
						/>
						<SheetClose
							render={
								<a className={cn(buttonVariants({ size: "default" }), "w-full justify-center")} href="/setup">
									Analiza mi CV gratis
									<ArrowRightIcon weight="bold" />
								</a>
							}
						/>
					</div>
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}
