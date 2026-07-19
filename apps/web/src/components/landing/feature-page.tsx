import { ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { LandingFooter } from "@/components/landing/footer";
import { SubpageTopBar } from "@/components/landing/subpage-top-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeatureStep {
	body: string;
	title: string;
}

export interface FeatureSection {
	paragraphs: readonly string[];
	title: string;
}

export interface FeatureFaqItem {
	a: string;
	q: string;
}

export interface RelatedTool {
	description: string;
	href: string;
	label: string;
}

export interface FeaturePageContent {
	ctaLabel: string;
	faqs: readonly FeatureFaqItem[];
	faqTitle: string;
	h1: string;
	/** Intro paragraphs under the H1; the first one doubles as the pitch. */
	intro: readonly string[];
	/** Mono uppercase kicker above the H1, e.g. "Herramienta gratuita". */
	kicker: string;
	planNote: { title: string; body: string };
	related: readonly RelatedTool[];
	/** Long-form body sections — the substance search engines index. */
	sections: readonly FeatureSection[];
	steps: readonly FeatureStep[];
	stepsTitle: string;
}

/**
 * Shared layout for the keyword-targeted feature landings (/score-cv,
 * /crear-cv, /carta-de-presentacion, /optimizador-linkedin, /coaching).
 * Content is intentionally static markup — no reveal animations on body copy —
 * so prerendered HTML carries the full text and LCP stays cheap on mobile.
 */
export function FeaturePage({ content }: { content: FeaturePageContent }) {
	return (
		<div className="relative isolate overflow-x-clip bg-background">
			<SubpageTopBar />
			<main>
				<section className="px-6 pt-24">
					<div className="mx-auto max-w-7xl">
						<div className="flex items-center gap-3 font-mono text-foreground/60 text-xs uppercase">
							<span aria-hidden="true" className="h-px w-7 bg-oxblood" />
							<span>{content.kicker}</span>
						</div>
						<h1 className="mt-4 max-w-[18ch] font-display text-5xl text-foreground leading-[0.95] tracking-tighter sm:text-6xl md:text-7xl">
							{content.h1}
						</h1>
						<div className="mt-6 flex max-w-2xl flex-col gap-4">
							{content.intro.map((paragraph) => (
								<p className="text-balance text-base text-foreground/65 leading-relaxed" key={paragraph.slice(0, 32)}>
									{paragraph}
								</p>
							))}
						</div>
						<div className="mt-8 flex flex-wrap items-center gap-3">
							<Link className={buttonVariants({ size: "lg", className: "rounded-full!" })} to="/login">
								{content.ctaLabel}
								<ArrowRightIcon weight="bold" />
							</Link>
							<Link
								className="rounded-full px-4 py-2 font-medium text-foreground/65 text-sm transition-colors hover:text-foreground"
								to="/pricing"
							>
								Ver planes y precios
							</Link>
						</div>
					</div>
				</section>

				<section className="px-6 pt-20">
					<div className="mx-auto max-w-7xl">
						<h2 className="max-w-[20ch] font-display text-3xl text-foreground leading-none tracking-tight sm:text-4xl">
							{content.stepsTitle}
						</h2>
						<ol className="mt-8 grid gap-2 md:grid-cols-3">
							{content.steps.map((step, idx) => (
								<li className="flex flex-col gap-3 rounded-3xl border border-border bg-card/40 p-6" key={step.title}>
									<span className="font-mono text-oxblood text-xs">{String(idx + 1).padStart(2, "0")}</span>
									<h3 className="font-display text-foreground text-xl tracking-tight">{step.title}</h3>
									<p className="text-foreground/65 text-sm leading-relaxed">{step.body}</p>
								</li>
							))}
						</ol>
					</div>
				</section>

				{content.sections.map((section) => (
					<section className="px-6 pt-16" key={section.title}>
						<article className="mx-auto max-w-7xl">
							<h2 className="max-w-[24ch] font-display text-3xl text-foreground leading-none tracking-tight sm:text-4xl">
								{section.title}
							</h2>
							<div className="mt-5 flex max-w-3xl flex-col gap-4">
								{section.paragraphs.map((paragraph) => (
									<p className="text-base text-foreground/70 leading-relaxed" key={paragraph.slice(0, 32)}>
										{paragraph}
									</p>
								))}
							</div>
						</article>
					</section>
				))}

				<section className="px-6 pt-16">
					<div className="mx-auto max-w-7xl rounded-3xl border border-oxblood/25 bg-oxblood/5 p-8 sm:p-10">
						<h2 className="font-display text-2xl text-foreground tracking-tight sm:text-3xl">
							{content.planNote.title}
						</h2>
						<p className="mt-3 max-w-3xl text-base text-foreground/70 leading-relaxed">{content.planNote.body}</p>
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<Link className={buttonVariants({ className: "rounded-full!" })} to="/login">
								{content.ctaLabel}
								<ArrowRightIcon weight="bold" />
							</Link>
							<Link
								className="rounded-full px-4 py-2 font-medium text-foreground/65 text-sm transition-colors hover:text-foreground"
								to="/pricing"
							>
								Comparar planes
							</Link>
						</div>
					</div>
				</section>

				<section className="px-6 pt-20">
					<div className="mx-auto max-w-7xl">
						<h2 className="font-display text-3xl text-foreground leading-none tracking-tight sm:text-4xl">
							{content.faqTitle}
						</h2>
						<dl className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
							{content.faqs.map((item) => (
								<div className="flex flex-col gap-2 border-border border-t pt-5" key={item.q}>
									<dt className="text-base text-foreground">{item.q}</dt>
									<dd className="text-foreground/65 text-sm leading-relaxed">{item.a}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section className="px-6 pt-20 pb-4">
					<div className="mx-auto max-w-7xl">
						<h2 className="font-mono text-foreground/60 text-xs uppercase">Más herramientas de ASSENDIA</h2>
						<ul className="mt-5 grid gap-2 sm:grid-cols-2">
							{content.related.map((tool) => (
								<li key={tool.href}>
									<a
										className={cn(
											"group flex items-center justify-between gap-4 rounded-2xl border border-border px-5 py-4",
											"transition-colors hover:border-oxblood/40"
										)}
										href={tool.href}
									>
										<span className="flex flex-col gap-0.5">
											<span className="text-foreground text-sm">{tool.label}</span>
											<span className="text-foreground/55 text-xs">{tool.description}</span>
										</span>
										<ArrowRightIcon
											className="size-4 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5"
											weight="bold"
										/>
									</a>
								</li>
							))}
						</ul>
					</div>
				</section>
			</main>
			<LandingFooter />
		</div>
	);
}
