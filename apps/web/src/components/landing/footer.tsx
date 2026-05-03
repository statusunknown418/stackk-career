import { InstagramLogoIcon, LinkedinLogoIcon, TiktokLogoIcon } from "@phosphor-icons/react";
import { FOOTER_COLUMNS } from "./data";

export function LandingFooter() {
	return (
		<footer className="mx-auto max-w-[1200px] border-foreground/10 border-t px-6 pt-20 pb-10">
			<div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
				<div className="col-span-2 md:col-span-1">
					<div className="flex items-baseline gap-1.5 font-display text-2xl text-foreground tracking-tight">
						<span aria-hidden="true" className="font-display-italic text-3xl text-oxblood leading-none">
							s
						</span>
						<span className="font-medium">stackcv</span>
						<span aria-hidden="true" className="ml-0.5 size-1.5 translate-y-[-3px] rounded-full bg-oxblood" />
					</div>
					<p className="mt-4 max-w-[280px] font-serif text-base text-foreground/65 italic leading-relaxed">
						Mentorías 1:1 de CV, LinkedIn y estrategia para recién graduados de LatAm.
					</p>
				</div>

				{FOOTER_COLUMNS.map((col) => (
					<div key={col.heading}>
						<h5 className="mb-5 font-mono text-[10px] text-oxblood uppercase tracking-[0.22em]">— {col.heading}</h5>
						<ul className="flex flex-col gap-2.5">
							{col.links.map((link) => (
								<li key={link.label}>
									<a
										className="font-serif text-base text-foreground/75 transition-colors hover:text-oxblood hover:italic"
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

			<div className="mt-16 grid items-end gap-6 border-foreground/10 border-t pt-8 md:grid-cols-3">
				<p className="font-mono text-[10px] text-foreground/55 uppercase tracking-[0.2em]">
					© 2026 stackcv · Buenos Aires · Bogotá
				</p>

				<p className="text-center font-display-italic text-base text-foreground/55">
					hecho a mano, una sesión a la vez.
				</p>

				<div className="flex justify-end gap-2">
					<SocialLink href="#" label="Instagram">
						<InstagramLogoIcon size={16} weight="bold" />
					</SocialLink>
					<SocialLink href="#" label="LinkedIn">
						<LinkedinLogoIcon size={16} weight="bold" />
					</SocialLink>
					<SocialLink href="#" label="TikTok">
						<TiktokLogoIcon size={16} weight="bold" />
					</SocialLink>
				</div>
			</div>
		</footer>
	);
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
	return (
		<a
			aria-label={label}
			className="grid size-9 place-items-center rounded-sm border border-foreground/15 text-foreground/60 transition hover:-translate-y-0.5 hover:border-oxblood hover:bg-oxblood hover:text-background"
			href={href}
		>
			{children}
		</a>
	);
}
