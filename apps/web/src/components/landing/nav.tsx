"use client";

import { ArrowRightIcon, ListIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetPanel, SheetPopup, SheetTrigger } from "@/components/ui/sheet";
import { useActiveSection } from "@/hooks/use-active-section";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./data";

const SECTION_IDS = NAV_LINKS.map((link) => link.href.replace("#", ""));
const CTA_SHOW_FROM_VIEWPORT_RATIO = 0.6;

export function LandingNav() {
	const activeId = useActiveSection(SECTION_IDS);
	const [showCta, setShowCta] = useState(false);

	// `useMotionValueEvent` is the motion/react-idiomatic way to react to scroll changes
	// without subscribing to window events directly. The CTA appears once the user has
	// scrolled past 60% of the viewport (i.e. they're past the hero and into the body).
	const { scrollY } = useScroll();
	useMotionValueEvent(scrollY, "change", (latest) => {
		if (typeof window === "undefined") {
			return;
		}
		setShowCta(latest > window.innerHeight * CTA_SHOW_FROM_VIEWPORT_RATIO);
	});

	return (
		<header className="sticky top-2 z-50 mx-auto w-full max-w-7xl px-4">
			<nav className="flex items-center gap-2 rounded-full border border-border bg-card/90 py-1.5 pr-1 pl-2 shadow-background/20 shadow-lg backdrop-blur-xl">
				<a className="flex shrink-0 items-center gap-2 pr-3 text-foreground tracking-tight" href="#top">
					<img
						alt="ASSENDIA"
						className="size-8 rounded-lg object-cover"
						height={32}
						src="/assendia-logo.png"
						width={32}
					/>
					<span className="font-display text-base leading-none tracking-tight">ASSENDIA</span>
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
										"relative inline-flex items-center rounded-full px-3 py-1.5 font-medium text-sm transition-colors",
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
					<Link
						className="hidden rounded-full px-3 py-1.5 font-medium text-foreground/65 text-sm transition-colors hover:text-foreground md:inline-flex"
						to="/login"
					>
						Iniciar sesión
					</Link>

					<AnimatePresence initial={false}>
						{showCta && (
							<motion.span
								animate={{ opacity: 1, scale: 1, width: "auto" }}
								className="hidden overflow-hidden md:inline-flex"
								exit={{ opacity: 0, scale: 0.85, width: 0 }}
								initial={{ opacity: 0, scale: 0.85, width: 0 }}
								transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
							>
								<Link
									className={buttonVariants({
										size: "sm",
										className: "rounded-full!",
									})}
									to="/login"
								>
									Analiza mi CV gratis
									<ArrowRightIcon weight="bold" />
								</Link>
							</motion.span>
						)}
					</AnimatePresence>

					<MobileMenu />
				</div>
			</nav>
		</header>
	);
}

function MobileMenu() {
	return (
		<Sheet>
			<SheetTrigger
				aria-label="Abrir menú"
				className="grid size-10 place-items-center rounded-full border border-border text-foreground/75 transition-colors hover:bg-muted hover:text-foreground md:hidden"
			>
				<ListIcon size={18} weight="bold" />
			</SheetTrigger>

			<SheetPopup className="w-[min(86vw,320px)]" side="right">
				<div className="flex items-center gap-2 px-5 pt-6">
					<img
						alt="ASSENDIA"
						className="size-8 rounded-lg object-cover"
						height={32}
						src="/assendia-logo.png"
						width={32}
					/>
					<span className="font-display text-foreground leading-none tracking-tight">ASSENDIA</span>
				</div>

				<SheetPanel>
					<ul className="mt-2 flex flex-col gap-1">
						{NAV_LINKS.map((link) => (
							<li key={link.href}>
								<SheetClose
									render={
										<a
											className="block rounded-lg px-3 py-3 font-medium text-base text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
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
								<Link
									className="rounded-lg px-3 py-2 font-medium text-foreground/75 text-sm transition-colors hover:bg-muted hover:text-foreground"
									to="/login"
								>
									Iniciar sesión
								</Link>
							}
						/>
						<SheetClose
							render={
								<Link className={cn(buttonVariants({ size: "default" }), "w-full justify-center")} to="/login">
									Analiza mi CV gratis
									<ArrowRightIcon weight="bold" />
								</Link>
							}
						/>
					</div>
				</SheetPanel>
			</SheetPopup>
		</Sheet>
	);
}
