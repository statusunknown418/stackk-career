import { ArrowsClockwiseIcon, TargetIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** "Vuelve el 5 de agosto" when the next run is known, else a generic hint. */
function nextRefreshHint(nextRefreshAt: Date | null): string {
	return nextRefreshAt ? `el ${format(nextRefreshAt, "d 'de' MMMM", { locale: es })}` : "tras tu próxima actualización";
}

/** No `ready` suggestions and no run in flight — the resting empty state. */
export function SuggestedEmpty({ nextRefreshAt }: { nextRefreshAt: Date | null }) {
	return (
		<Empty className="rounded-xl border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<TargetIcon className="text-oxblood" />
				</EmptyMedia>
				<EmptyTitle>Aún no hay vacantes</EmptyTitle>
				<EmptyDescription>
					Buscamos oportunidades según tu perfil y CV principal. Vuelve {nextRefreshHint(nextRefreshAt)}.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

/** A run is `pending`/`running` and nothing is surfaced yet — the first-run wait. */
export function SuggestedPending() {
	return (
		<Empty className="rounded-xl border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<ArrowsClockwiseIcon className="animate-spin text-oxblood" />
				</EmptyMedia>
				<EmptyTitle>
					<Shimmer>Buscando vacantes…</Shimmer>
				</EmptyTitle>
				<EmptyDescription>Analizamos ofertas para tu perfil. Esto puede tardar un momento.</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

/** The latest run failed and there is nothing to show — reassure, don't alarm. */
export function SuggestedFailed({ nextRefreshAt }: { nextRefreshAt: Date | null }) {
	return (
		<Empty className="rounded-xl border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<WarningCircleIcon className="text-muted-foreground" />
				</EmptyMedia>
				<EmptyTitle>No pudimos actualizar tus vacantes</EmptyTitle>
				<EmptyDescription>Lo intentaremos de nuevo {nextRefreshHint(nextRefreshAt)}.</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
