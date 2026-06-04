import type { Icon } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Card, CardHeader, CardPanel } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RICH_BODY_CLASS =
	"text-sm leading-relaxed [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_p+p]:mt-3 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5";

// Ease-out exponencial: el contenido entra rápido y asienta suave (sin rebote). Solo animamos
// opacity + transform (compositor-friendly), nunca propiedades de layout.
const SECTION_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Etiqueta de sección: uppercase pequeña y muted. Compartida por la carta editable y la de solo
// lectura para que ambas vistas tengan la misma jerarquía.
const SECTION_LABEL_CLASS = "flex items-center gap-2 font-medium text-muted-foreground text-xs uppercase tracking-wide";

/**
 * Anchos (clases tailwind) de las barras del skeleton por sección — reflejan la FORMA real de una
 * carta (saludo corto, cuerpo largo y variado, cierre medio, firma corta) en vez de barras
 * genéricas iguales. Anchos únicos por sección para poder keyear por el ancho (sin index key).
 */
export const SECTION_SKELETON_LINES: Record<"greeting" | "body" | "closing" | "signature", readonly string[]> = {
	greeting: ["w-2/5"],
	body: ["w-full", "w-11/12", "w-5/6", "w-4/5", "w-3/4", "w-2/3"],
	closing: ["w-3/4", "w-1/2"],
	signature: ["w-1/3"],
};

interface LetterSectionShellProps {
	children: ReactNode;
	icon: Icon;
	isStreaming: boolean;
	label: string;
	/**
	 * El cuerpo es la sección dominante: va dentro de una Card prominente. El resto (saludo, cierre,
	 * firma) son filas planas y livianas — así la carta tiene jerarquía y no es un grid de tarjetas
	 * idénticas.
	 */
	primary: boolean;
}

/**
 * Contenedor + etiqueta de una sección de la carta. `primary` (el cuerpo) se envuelve en una Card
 * prominente; las demás secciones son filas planas compactas. Lo usan tanto la vista editable como
 * la de solo lectura para que la jerarquía sea idéntica en ambos modos.
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

	// Todas las secciones tienen su Card. El cuerpo (`primary`) además crece para llenar el alto
	// disponible del panel (es la sección principal), con un piso de altura — así el panel no queda
	// con un hueco vacío abajo y la jerarquía se da por tamaño, no por quitarle el box a las demás.
	return (
		<Card className={primary ? "min-h-44 flex-1" : undefined}>
			<CardHeader className="px-4 pt-3.5 pb-2">{header}</CardHeader>
			<CardPanel className="px-4 pt-0 pb-4">{children}</CardPanel>
		</Card>
	);
}

interface CoverLetterSectionProps {
	icon: Icon;
	isStreaming: boolean;
	label: string;
	primary: boolean;
	/** Contenido de la sección como HTML (de TipTap o de texto plano escapado). Ausente = aún no llega. */
	richHtml?: string | undefined;
	showSkeleton: boolean;
	skeletonLines: readonly string[];
}

/**
 * One block of the cover-letter artifact (greeting, body, closing, signature) en modo solo lectura
 * / streaming. El contenido cruza skeleton ↔ texto con un fade (no aparece de golpe); el `key`
 * estable evita re-animar en cada chunk del stream, así el llenado se siente fluido.
 */
export function CoverLetterSection({
	icon,
	isStreaming,
	label,
	primary,
	richHtml,
	showSkeleton,
	skeletonLines,
}: CoverLetterSectionProps) {
	const reduceMotion = useReducedMotion();

	let panelContent: ReactNode = null;
	if (richHtml) {
		panelContent = (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0 }}
				initial={{ opacity: 0, y: 4 }}
				key="content"
				transition={{ duration: reduceMotion ? 0 : 0.28, ease: SECTION_EASE }}
			>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: HTML proviene de TipTap (StarterKit, sin scripts) o de texto plano escapado. */}
				<div className={RICH_BODY_CLASS} dangerouslySetInnerHTML={{ __html: richHtml }} />
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
		<LetterSectionShell icon={icon} isStreaming={isStreaming} label={label} primary={primary}>
			<AnimatePresence initial={false} mode="wait">
				{panelContent}
			</AnimatePresence>
		</LetterSectionShell>
	);
}
