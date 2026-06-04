import type { Icon } from "@phosphor-icons/react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CoverLetterSectionProps {
	icon: Icon;
	isStreaming: boolean;
	label: string;
	/** Contenido de la sección como HTML (de TipTap o de texto plano escapado). Ausente = aún no llega. */
	richHtml?: string | undefined;
	showSkeleton: boolean;
}

const RICH_BODY_CLASS =
	"text-sm leading-relaxed [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-3 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5";

/**
 * One block of the cover-letter artifact (greeting, body, closing, signature).
 * Visual language matches the analysis edits' cards (see resume-editor/resume-analysis-panel.tsx):
 * Card + CardHeader/CardTitle/CardPanel, with Shimmer while the model writes
 * the section and Skeleton bars while we wait for the field to start streaming.
 */
export function CoverLetterSection({
	icon: IconComponent,
	isStreaming,
	label,
	richHtml,
	showSkeleton,
}: CoverLetterSectionProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<IconComponent weight="duotone" />
					{label}
				</CardTitle>
				{isStreaming && (
					<CardDescription>
						<Shimmer>redactando…</Shimmer>
					</CardDescription>
				)}
			</CardHeader>

			<CardPanel>
				{richHtml ? (
					// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML proviene de TipTap (StarterKit, sin scripts) o de texto plano escapado.
					<div className={RICH_BODY_CLASS} dangerouslySetInnerHTML={{ __html: richHtml }} />
				) : null}
				{!richHtml && showSkeleton && (
					<div className="flex flex-col gap-1.5">
						<Skeleton className="h-3 w-full rounded-full" />
						<Skeleton className="h-3 w-[85%] rounded-full" />
						<Skeleton className="h-3 w-[60%] rounded-full" />
					</div>
				)}
			</CardPanel>
		</Card>
	);
}
