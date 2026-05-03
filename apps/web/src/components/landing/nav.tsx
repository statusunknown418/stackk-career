import { ArrowRightIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { NAV_LINKS } from "./data";

export function LandingNav() {
	return (
		<header className="sticky top-4 z-50 mx-auto mt-4 w-full max-w-[1200px] px-4">
			<nav className="flex items-center gap-6 rounded-full border border-foreground/10 bg-background/70 py-2 pr-2 pl-5 shadow-[0_1px_0_oklch(0.18_0.02_40_/_0.04),0_20px_60px_-30px_oklch(0.18_0.02_40_/_0.35)] backdrop-blur-xl backdrop-saturate-150">
				<a className="flex shrink-0 items-baseline gap-1.5 text-foreground tracking-tight" href="#top">
					<span aria-hidden="true" className="font-display-italic text-2xl text-oxblood leading-none">
						s
					</span>
					<span className="font-display font-semibold text-[1.05rem] leading-none">stackcv</span>
					<span aria-hidden="true" className="ml-0.5 size-1 translate-y-[-2px] rounded-full bg-oxblood" />
				</a>

				<ul className="hidden flex-1 items-center justify-center gap-1 md:flex">
					{NAV_LINKS.map((link) => (
						<li key={link.href}>
							<a
								className="rounded-full px-3.5 py-1.5 font-medium text-[13px] text-foreground/65 transition-colors hover:bg-foreground/5 hover:text-foreground"
								href={link.href}
							>
								{link.label}
							</a>
						</li>
					))}
				</ul>

				<div className="ml-auto flex items-center gap-1.5 md:ml-0">
					<a
						className="hidden rounded-full px-3 py-1.5 font-medium text-[13px] text-foreground/65 transition-colors hover:text-foreground sm:inline-flex"
						href="/login"
					>
						Iniciar sesión
					</a>
					<a className={buttonVariants({ size: "sm" })} href="#planes">
						Empezar gratis
						<ArrowRightIcon weight="bold" />
					</a>
				</div>
			</nav>
		</header>
	);
}
