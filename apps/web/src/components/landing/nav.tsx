"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./data";

const SECTION_IDS = NAV_LINKS.map((link) => link.href.replace("#", ""));

export function LandingNav() {
	const [activeId, setActiveId] = useState<string | null>(null);

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
		<header className="sticky top-4 z-50 mx-auto mt-4 w-full max-w-[1200px] px-4">
			<nav className="flex items-center gap-2 rounded-full border border-foreground/10 bg-background/80 py-2 pr-2 pl-3 shadow-[var(--shadow-nav)] backdrop-blur-xl backdrop-saturate-150">
				<a className="flex shrink-0 items-center gap-2 pr-3 text-foreground tracking-tight" href="#top">
					<span
						aria-hidden="true"
						className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-oxblood to-marigold font-display font-extrabold text-[14px] text-white leading-none shadow-[var(--shadow-logo)]"
					>
						i
					</span>
					<span className="font-bold font-display text-[1.05rem] leading-none tracking-[-0.02em]">IMPULSA</span>
				</a>

				<span aria-hidden="true" className="hidden h-5 w-px bg-foreground/10 md:block" />

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
										isActive ? "text-foreground" : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
									)}
									href={link.href}
								>
									{link.label}
									{isActive && (
										<span
											aria-hidden="true"
											className="absolute bottom-[2px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-oxblood"
										/>
									)}
								</a>
							</li>
						);
					})}
				</ul>

				<span aria-hidden="true" className="hidden h-5 w-px bg-foreground/10 md:block" />

				<div className="ml-auto flex items-center gap-1.5 md:ml-0">
					<a
						className="hidden rounded-full px-3 py-1.5 font-medium text-[13px] text-foreground/65 transition-colors hover:text-foreground sm:inline-flex"
						href="/login"
					>
						Iniciar sesión
					</a>
					<button className={buttonVariants({ size: "sm" })} type="button">
						Score gratis
						<ArrowRightIcon weight="bold" />
					</button>
				</div>
			</nav>
		</header>
	);
}
