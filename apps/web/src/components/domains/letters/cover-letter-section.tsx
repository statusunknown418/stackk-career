import type { Icon } from "@phosphor-icons/react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CoverLetterSectionProps {
	icon: Icon;
	isStreaming: boolean;
	label: string;
	showSkeleton: boolean;
	text: string | undefined;
}

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
	showSkeleton,
	text,
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
				{text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>}
				{!text && showSkeleton && (
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
