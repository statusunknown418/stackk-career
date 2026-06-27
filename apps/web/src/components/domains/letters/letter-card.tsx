import { ArrowRightIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import { normalizeTemplate, TEMPLATE_LABELS } from "@stackk-career/schemas/api/letters";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, firstMeaningful } from "@/lib/utils";

/** Cover-letter row as returned by the `letters.list` procedure. */
type LetterListItem = AppRouterOutputs["letters"]["list"][number];

/** Faux letter sheet: a letterhead accent plus the real body preview, reading like a page. */
function LetterSheetPreview({ preview }: { preview: string | null }) {
	return (
		<div aria-hidden="true" className="relative h-26 overflow-hidden rounded-xl border bg-linear-to-br from-muted">
			<div className="absolute inset-x-5 top-4 flex flex-col gap-2 rounded-t-lg bg-background p-4 shadow-sm">
				<div className="flex items-center gap-1.5">
					<span className="h-1 w-6 rounded-full bg-primary/60" />
					<span className="h-1 w-10 rounded-full bg-foreground/12" />
				</div>

				{preview ? (
					<p className="line-clamp-3 text-[0.6rem] text-muted-foreground leading-relaxed">{preview}</p>
				) : (
					<div className="flex flex-col gap-1.5">
						<div className="h-1.5 w-full rounded-full bg-foreground/8" />
						<div className="h-1.5 w-11/12 rounded-full bg-foreground/8" />
						<div className="h-1.5 w-4/5 rounded-full bg-foreground/8" />
					</div>
				)}
			</div>
		</div>
	);
}

export function LetterCard({ letter }: { letter: LetterListItem }) {
	const updatedLabel = formatDistanceToNow(letter.updatedAt, { addSuffix: true, locale: es });
	// CASEY writes a clean "Rol · Empresa" label (`documentTitle`); fall back to the raw
	// job position, then a generic. Skips blanks/whitespace via `firstMeaningful`.
	const cardTitle = firstMeaningful([letter.documentTitle, letter.title]) ?? "Carta sin título";

	return (
		<Link className="block h-full" params={{ generationId: letter.id }} to="/dash/letters/$generationId">
			<Frame
				aria-labelledby={`letter-${letter.id}-title`}
				className="group h-full gap-3 p-3 transition-colors hover:bg-muted"
			>
				<LetterSheetPreview preview={letter.preview} />

				<div className="flex items-center justify-between gap-2">
					<ul aria-label="Etiquetas de la carta" className="flex min-w-0 list-none flex-wrap items-center gap-1">
						<li className="flex min-w-0">
							<Badge size="sm" variant="secondary">
								{TEMPLATE_LABELS[normalizeTemplate(letter.template)]}
							</Badge>
						</li>

						<li className="flex min-w-0">
							<Badge className="font-mono" size="sm" variant="outline">
								{letter.language === "en" ? "EN" : "ES"}
							</Badge>
						</li>

						{letter.resumeTitle && (
							<li className="flex min-w-0">
								<Badge className="min-w-0 shrink" size="sm" variant="outline">
									<ReadCvLogoIcon weight="fill" />
									<span className="min-w-0 truncate">{letter.resumeTitle}</span>
								</Badge>
							</li>
						)}
					</ul>
				</div>

				<FrameTitle
					className="min-w-0 truncate text-base underline-offset-4 group-hover:underline"
					id={`letter-${letter.id}-title`}
				>
					{cardTitle}
				</FrameTitle>

				<div className="flex flex-col gap-2">
					<time className="text-muted-foreground text-xs" dateTime={formatISO(letter.updatedAt)}>
						Actualizada {updatedLabel}
					</time>

					<span aria-hidden="true" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-between")}>
						Editar carta
						<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" weight="bold" />
					</span>
				</div>
			</Frame>
		</Link>
	);
}

export function LetterCardSkeleton() {
	return (
		<Frame aria-hidden="true" className="h-full gap-3 p-3">
			<Skeleton className="h-26 w-full rounded-xl" />

			<div className="flex items-center gap-1">
				<Skeleton className="h-5 w-10 rounded-sm" />
				<Skeleton className="h-5 w-24 rounded-sm" />
			</div>

			<Skeleton className="h-5 w-40 rounded-md" />

			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-28 rounded-md" />
				<Skeleton className="h-8 w-full rounded-lg" />
			</div>
		</Frame>
	);
}
