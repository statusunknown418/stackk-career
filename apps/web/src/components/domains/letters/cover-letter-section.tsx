import type { Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Card, CardHeader, CardPanel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Exponential ease-out, no bounce. Only animate opacity + transform (compositor-friendly),
// never layout properties.
const SECTION_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Section label, shared by the editable and read-only views so both have the same hierarchy.
const SECTION_LABEL_CLASS = "flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide";

/**
 * Skeleton bar widths per section — mirror the real shape of a letter (short greeting, long body,
 * medium closing, short signature). Widths are unique within a section so they can be used as keys.
 */
export const SECTION_SKELETON_LINES: Record<"greeting" | "body" | "closing" | "signature", readonly string[]> = {
	greeting: ["w-2/5"],
	body: ["w-full", "w-11/12", "w-5/6", "w-4/5", "w-3/4", "w-2/3"],
	closing: ["w-3/4", "w-1/2"],
	signature: ["w-1/3"],
};

/**
 * Static identity of a letter section (icon, key, label, primary flag), passed as one `def` object
 * since these props always travel together. `key` indexes SECTION_SKELETON_LINES.
 */
export interface LetterSectionDef {
	icon: Icon;
	key: keyof typeof SECTION_SKELETON_LINES;
	label: string;
	primary: boolean;
}

interface LetterSectionShellProps {
	children: ReactNode;
	icon: Icon;
	isStreaming: boolean;
	label: string;
	/**
	 * The body is the dominant section and gets a prominent Card; the rest stay light so the
	 * letter has hierarchy instead of a grid of identical cards.
	 */
	primary: boolean;
}

/**
 * Container + label for a letter section. Used by both the editable and read-only views so the
 * hierarchy is identical in both modes.
 */
export function LetterSectionShell({
	children,
	icon: IconComponent,
	isStreaming,
	label,
	primary,
}: LetterSectionShellProps) {
	const header = (
		<div className={SECTION_LABEL_CLASS}>
			<IconComponent className="size-3.5" weight="duotone" />
			<span>{label}</span>
			{isStreaming && (
				<span className="ml-1 font-normal text-[11px] normal-case tracking-normal">
					<Shimmer>redactando…</Shimmer>
				</span>
			)}
		</div>
	);

	// The body (`primary`) grows to fill the panel height (with a min height) so the panel has no
	// empty gap below and hierarchy comes from size.
	return (
		<Card className={primary ? "min-h-44 flex-1" : undefined}>
			<CardHeader className="px-4 pt-3.5 pb-2">{header}</CardHeader>
			<CardPanel className="px-4 pt-0 pb-4">{children}</CardPanel>
		</Card>
	);
}

interface CoverLetterSectionProps {
	/** Static section identity (icon, key, label, primary flag). */
	def: LetterSectionDef;
	isStreaming: boolean;
	showSkeleton: boolean;
	/** Plain text streamed by CASEY. Absent = not arrived yet. */
	text?: string | undefined;
}

/**
 * One block of the cover-letter artifact (greeting, body, closing, signature) in read-only /
 * streaming mode. Skeleton ↔ text cross-fades; the stable `key` avoids re-animating on every
 * stream chunk.
 */
export function CoverLetterSection({ def, isStreaming, showSkeleton, text }: CoverLetterSectionProps) {
	const reduceMotion = useReducedMotion();
	const skeletonLines = SECTION_SKELETON_LINES[def.key];

	let panelContent: ReactNode = null;
	if (text) {
		panelContent = (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0 }}
				initial={{ opacity: 0, y: 4 }}
				key="content"
				transition={{ duration: reduceMotion ? 0 : 0.28, ease: SECTION_EASE }}
			>
				{/* Plain text (React-escaped); whitespace-pre-line preserves CASEY's line breaks. */}
				<div className="whitespace-pre-line text-sm leading-relaxed">{text}</div>
			</motion.div>
		);
	} else if (showSkeleton) {
		panelContent = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex flex-col gap-1.5"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="skeleton"
				transition={{ duration: reduceMotion ? 0 : 0.2 }}
			>
				{skeletonLines.map((width) => (
					<Skeleton className={`h-3 rounded-full ${width}`} key={width} />
				))}
			</motion.div>
		);
	}

	return (
		<LetterSectionShell icon={def.icon} isStreaming={isStreaming} label={def.label} primary={def.primary}>
			<AnimatePresence initial={false} mode="wait">
				{panelContent}
			</AnimatePresence>
		</LetterSectionShell>
	);
}
