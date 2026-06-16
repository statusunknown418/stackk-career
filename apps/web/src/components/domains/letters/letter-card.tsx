import { ArrowRightIcon, ReadCvLogoIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Frame, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { client } from "@/utils/orpc";

/** Cover-letter row exactly as the oRPC client deserializes it from `letters.list`. */
type LetterListItem = Awaited<ReturnType<typeof client.letters.list>>[number];

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

	return (
		<Link className="block h-full" params={{ generationId: letter.id }} to="/dash/letters/$generationId">
			<Frame
				aria-labelledby={`letter-${letter.id}-title`}
				className="group h-full gap-3 p-3 transition-colors hover:bg-muted"
			>
				<LetterSheetPreview preview={letter.preview} />

				<div className="flex items-center justify-between gap-2">
					<ul aria-label="Etiquetas de la carta" className="flex min-w-0 list-none items-center gap-1">
						<li>
							<Badge size="sm" variant="secondary">
								{letter.language === "en" ? "EN" : "ES"}
							</Badge>
						</li>

						{letter.resumeTitle && (
							<li className="min-w-0">
								<Badge className="max-w-full" size="sm" variant="outline">
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
					{letter.title ?? "Sin título"}
				</FrameTitle>

				<div className="flex flex-col gap-2">
					<time className="text-muted-foreground text-xs" dateTime={formatISO(letter.updatedAt)}>
						Actualizada {updatedLabel}
					</time>

					<span aria-hidden="true" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-between")}>
						Ver carta
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
