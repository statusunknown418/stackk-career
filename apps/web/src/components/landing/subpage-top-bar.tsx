import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

/**
 * Compact sticky navigation for pages below the homepage (pricing, feature
 * landings). Keeps the brand mark, a way back home and the primary CTA without
 * the anchor links that only make sense on the landing page itself.
 */
export function SubpageTopBar() {
	return (
		<header className="sticky top-2 z-50 mx-auto w-full max-w-7xl px-4">
			<nav className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1.5 pr-1 pl-2 backdrop-blur-md">
				<Link className="flex shrink-0 items-center gap-2 pr-3 text-foreground tracking-tight" to="/">
					<img
						alt="ASSENDIA"
						className="size-8 rounded-lg object-cover"
						height={32}
						src="/assendia-logo.png"
						width={32}
					/>
					<span className="font-display text-base leading-none tracking-tight">ASSENDIA</span>
				</Link>

				<Link
					className="group ml-1 hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-foreground/60 text-sm transition-colors hover:text-foreground sm:inline-flex"
					to="/"
				>
					<ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" weight="bold" />
					Volver al inicio
				</Link>

				<div className="ml-auto flex items-center gap-1.5">
					<Link
						className="hidden rounded-full px-3 py-1.5 font-medium text-foreground/65 text-sm transition-colors hover:text-foreground sm:inline-flex"
						to="/login"
					>
						Iniciar sesión
					</Link>
					<Link className={buttonVariants({ size: "sm", className: "rounded-full!" })} to="/login">
						Empezar gratis
						<ArrowRightIcon weight="bold" />
					</Link>
				</div>
			</nav>
		</header>
	);
}
