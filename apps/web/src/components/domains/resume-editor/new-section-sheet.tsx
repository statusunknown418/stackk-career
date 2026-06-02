import { CheckCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import type { CreateBlockApiMutationInput } from "@stackk-career/schemas/api/blocks";
import { blankResumeSections, SECTION_DEFINITIONS } from "@stackk-career/schemas/api/resumes";
import { mapParseBlocks } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ResumeFormApi } from "@/lib/forms/resume-form";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc } from "@/utils/orpc";
import { SECTION_ICONS } from "./section-icons";
import { useCreateBlock } from "./use-block-mutations";

interface NewSectionSheetProps {
	form: ResumeFormApi;
	// Insertion window. When omitted, falls back to header append-at-end.
	nextPosition?: string | null;
	// Controlled mode: caller drives open state (inline insertion zones).
	onOpenChange?: (open: boolean) => void;
	open?: boolean;
	previousPosition?: string | null;
	// When false, suppress the built-in header trigger button. Defaults to true.
	showTrigger?: boolean;
	size?: ButtonProps["size"];
}

interface SectionOption {
	description: string;
	icon: ComponentType<{ className?: string }>;
	id: string;
	isUnique: boolean;
	layout: (typeof SECTION_DEFINITIONS)[number]["layout"];
	title: string;
}

const sectionOptions: readonly SectionOption[] = SECTION_DEFINITIONS.map((definition) => ({
	id: definition.kind,
	title: definition.title,
	description: definition.description,
	layout: definition.layout,
	isUnique: definition.isUnique,
	icon: SECTION_ICONS[definition.kind],
}));

const normalize = (value: string) => value.trim().toLowerCase();

export const NewSectionSheet = ({
	form,
	nextPosition,
	onOpenChange,
	open,
	previousPosition,
	showTrigger = true,
	size = "default",
}: NewSectionSheetProps) => {
	const params = Route.useParams();
	const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));

	const createBlock = useCreateBlock({ form });

	const parsedBlocks = mapParseBlocks(data.blocks);
	const usedTitles = new Set(
		parsedBlocks.filter((block) => block.blockType === "section").map((block) => normalize(block.content.title))
	);
	const topLevelBlocks = sortLexoPositions(
		parsedBlocks.filter((block) => block.parentBlockId === null),
		(block) => block.position
	);
	const lastTopLevelBlock = topLevelBlocks.at(-1) ?? null;

	// Caller-provided window wins. Otherwise header default = append-at-end.
	const hasExplicitWindow = previousPosition !== undefined || nextPosition !== undefined;
	const resolvedBefore = hasExplicitWindow ? (previousPosition ?? null) : (lastTopLevelBlock?.position ?? null);
	const resolvedAfter = hasExplicitWindow ? (nextPosition ?? null) : null;

	const handleCreateSection = async (option: SectionOption) => {
		const defaultSection = blankResumeSections.find((section) => normalize(section.title) === normalize(option.title));
		const title = defaultSection?.title ?? option.title;

		const input: CreateBlockApiMutationInput = {
			resumeId: params.resumeId,
			parentBlockId: null,
			before: resolvedBefore,
			after: resolvedAfter,
			blockType: "section",
			content: {
				title,
				layout: option.layout,
				isCustom: false,
			},
		};

		await createBlock.enqueue(input);
		onOpenChange?.(false);
	};

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			{showTrigger && (
				<Button render={<SheetTrigger />} size={size} variant="outline">
					<PlusCircleIcon />
					Agregar sección
				</Button>
			)}

			<SheetContent variant="inset">
				<SheetHeader>
					<SheetTitle>Nueva sección</SheetTitle>
					<SheetDescription>Escoge entre las secciones disponibles optimizadas para ATS</SheetDescription>
				</SheetHeader>

				<section className="overflow-y-scroll">
					<ItemGroup className="gap-2 px-4 pb-4">
						{sectionOptions.map((option) => {
							const Icon = option.icon;
							const isDisabled = option.isUnique && usedTitles.has(normalize(option.title));

							return (
								<Item asChild key={option.id} size="sm" variant="outline">
									<button
										aria-disabled={isDisabled}
										className={
											isDisabled
												? "pointer-events-none text-left opacity-60"
												: "cursor-pointer text-left transition-transform hover:bg-accent/50 active:scale-[0.99]"
										}
										data-disabled={isDisabled}
										disabled={isDisabled || createBlock.isPending}
										onClick={async () => {
											await handleCreateSection(option);
										}}
										type="button"
									>
										<ItemMedia variant="icon">
											<Icon className="size-4" />
										</ItemMedia>
										<ItemContent>
											<ItemTitle>{option.title}</ItemTitle>
											<ItemDescription>{option.description}</ItemDescription>
										</ItemContent>

										{isDisabled && (
											<ItemActions>
												<CheckCircleIcon className="size-5" weight="fill" />
											</ItemActions>
										)}
									</button>
								</Item>
							);
						})}
					</ItemGroup>
				</section>
			</SheetContent>
		</Sheet>
	);
};
