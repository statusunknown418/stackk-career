import { ArrowRightIcon, MagnifyingGlassIcon, StarIcon } from "@phosphor-icons/react";
import type { AppRouterOutputs } from "@stackk-career/api/routers/index";
import type { ResumeListItem } from "@stackk-career/schemas/api/resumes";
import type { ResumeStatus } from "@stackk-career/schemas/db/resumes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow, formatISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Frame, FrameTitle } from "@/components/ui/frame";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, firstMeaningful } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type ResumeListData = AppRouterOutputs["resumes"]["list"];

/** Accent bar colour for the faux CV sheet, mirroring the status badge tone. */
const STATUS_ACCENT: Record<ResumeStatus, string> = {
	draft: "bg-warning/60",
	ready: "bg-success/60",
	archived: "bg-muted-foreground/30",
};

/** DB default for unnamed CVs; treated as "no title" when deriving display text. */
const PLACEHOLDER_RESUME_TITLE = "CV sin título";

/** CV-sheet preview rendering the holder's identity so the card reads like a real document. */
function ResumeSheetPreview({
	name,
	subtitle,
	detail,
	status,
}: {
	name: string;
	subtitle: string;
	detail: string | null;
	status: ResumeStatus;
}) {
	return (
		<div aria-hidden="true" className="relative h-26 overflow-hidden rounded-xl border bg-linear-to-br from-muted">
			<div className="absolute inset-x-5 top-4 flex flex-col gap-1.5 rounded-t-lg bg-background p-4 shadow-sm">
				<p className="truncate text-foreground text-sm leading-none">{name}</p>

				{subtitle && <p className="truncate text-muted-foreground text-xs leading-none">{subtitle}</p>}

				{detail && <p className="truncate text-muted-foreground/70 text-xs leading-none">{detail}</p>}

				<div className={cn("mt-2 h-1 w-8 rounded-full", STATUS_ACCENT[status])} />

				<div className="mt-1 flex flex-col gap-1.5">
					<div className="h-1.5 w-full rounded-full bg-foreground/8" />
					<div className="h-1.5 w-11/12 rounded-full bg-foreground/8" />
					<div className="h-1.5 w-4/5 rounded-full bg-foreground/8" />
				</div>
			</div>
		</div>
	);
}

export function ResumeCard({ resume }: { resume: ResumeListItem }) {
	const updatedLabel = formatDistanceToNow(resume.updatedAt, { addSuffix: true, locale: es });

	const fullName = [resume.contact?.firstName, resume.contact?.lastName]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" ");
	const subtitle = [resume.targetRole, resume.targetedCompanyIdentifier]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" · ");
	const contactDetail = resume.contact?.detail ?? null;

	// Faux sheet reads like the real document: holder's name first, then any
	// meaningful title or the target role — never the bare placeholder default.
	const sheetName =
		firstMeaningful([fullName, resume.title, subtitle], [PLACEHOLDER_RESUME_TITLE]) ?? PLACEHOLDER_RESUME_TITLE;
	// Card heading: the user's title when set, else the target role/company, else the holder.
	const cardTitle =
		firstMeaningful([resume.title, subtitle, fullName], [PLACEHOLDER_RESUME_TITLE]) ?? PLACEHOLDER_RESUME_TITLE;

	const queryClient = useQueryClient();
	const listKey = orpc.resumes.list.queryKey();
	const setPrimary = useMutation(
		orpc.resumes.setPrimary.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: listKey });
				const previous = queryClient.getQueryData<ResumeListData>(listKey);
				queryClient.setQueryData<ResumeListData>(listKey, (items) =>
					items?.map((item) => ({ ...item, isPrimary: item.id === resume.id }))
				);
				return { previous };
			},
			onError: (_error, _input, ctx) => {
				if (ctx?.previous) {
					queryClient.setQueryData(listKey, ctx.previous);
				}
				toast.error("No pudimos marcar este CV como principal.");
			},
			onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
		})
	);

	return (
		<li className="relative h-full">
			<Link className="block h-full" params={{ resumeId: resume.id }} to="/dash/resumes/$resumeId">
				<Frame
					aria-labelledby={`resume-${resume.id}-title`}
					className="group h-full gap-2 p-3 transition-colors hover:bg-muted"
				>
					<ResumeSheetPreview detail={contactDetail} name={sheetName} status={resume.status} subtitle={subtitle} />

					<div className="flex items-center justify-between gap-2">
						<ul aria-label="Etiquetas del CV" className="flex min-w-0 list-none flex-wrap items-center gap-1">
							{resume.isPrimary && (
								<li className="flex min-w-0">
									<Badge size="sm" variant="info">
										<StarIcon weight="fill" />
										Principal
									</Badge>
								</li>
							)}

							{(resume.jobTargetStatus === "pending" || resume.jobTargetStatus === "fetching") && (
								<li className="flex min-w-0">
									<Badge size="sm" variant="secondary">
										<MagnifyingGlassIcon />
										Buscando puesto…
									</Badge>
								</li>
							)}
						</ul>
					</div>

					<FrameTitle
						className="min-w-0 truncate text-base underline-offset-4 group-hover:underline"
						id={`resume-${resume.id}-title`}
					>
						{cardTitle}
					</FrameTitle>

					<div className="flex flex-col gap-2">
						<time className="text-muted-foreground text-xs" dateTime={formatISO(resume.updatedAt)}>
							Actualizado {updatedLabel}
						</time>

						<span aria-hidden="true" className={cn(buttonVariants({ variant: "secondary" }), "w-full justify-between")}>
							Editar CV
							<ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" weight="bold" />
						</span>
					</div>
				</Frame>
			</Link>
			{!resume.isPrimary && (
				<Button
					aria-label="Marcar como principal"
					className="absolute top-2 right-2 z-10 shadow-sm"
					loading={setPrimary.isPending}
					onClick={() => setPrimary.mutate({ id: resume.id })}
					size="icon-sm"
					title="Marcar como principal"
					variant="secondary"
				>
					<StarIcon />
				</Button>
			)}
		</li>
	);
}

export function ResumeCardSkeleton() {
	return (
		<Frame aria-hidden="true" className="h-full gap-3 p-3">
			<Skeleton className="aspect-[4/3] w-full rounded-xl" />

			<div className="flex items-center justify-between gap-2">
				<Skeleton className="h-5 w-20 rounded-sm" />
				<Skeleton className="h-5 w-14 rounded-sm" />
			</div>

			<div className="flex flex-1 flex-col gap-1.5">
				<Skeleton className="h-5 w-40 rounded-md" />
				<Skeleton className="h-4 w-28 rounded-md" />
			</div>

			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-24 rounded-md" />
				<Skeleton className="h-8 w-full rounded-lg" />
			</div>
		</Frame>
	);
}
