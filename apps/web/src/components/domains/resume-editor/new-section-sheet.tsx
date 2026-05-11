import {
	BriefcaseIcon,
	CertificateIcon,
	CheckCircleIcon,
	FolderSimpleIcon,
	GraduationCapIcon,
	HandHeartIcon,
	NotePencilIcon,
	PlusCircleIcon,
	TextAlignLeftIcon,
	TranslateIcon,
	WrenchIcon,
} from "@phosphor-icons/react";
import type { CreateBlockApiMutationInput } from "@stackk-career/schemas/api/blocks";
import { blankResumeSections } from "@stackk-career/schemas/api/resumes";
import { mapParseBlocks } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { constructNow } from "date-fns";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Route } from "@/routes/_protected/dash/resumes/$resumeId";
import { orpc, queryClient } from "@/utils/orpc";

type SectionLayout = "entries" | "skills" | "freeform";

interface SectionOption {
	description: string;
	icon: ComponentType<{ className?: string }>;
	id: string;
	isUnique: boolean;
	layout: SectionLayout;
	title: string;
}

const SECTION_OPTIONS: readonly SectionOption[] = [
	{
		id: "summary",
		title: "Resumen profesional",
		description: "Párrafo breve con tu propuesta de valor y experiencia clave.",
		layout: "freeform",
		icon: TextAlignLeftIcon,
		isUnique: true,
	},
	{
		id: "experience",
		title: "Experiencia laboral",
		description: "Cargos, empresas y logros cuantificados con verbos de acción.",
		layout: "entries",
		icon: BriefcaseIcon,
		isUnique: true,
	},
	{
		id: "education",
		title: "Educación",
		description: "Títulos, instituciones y fechas de tus estudios formales.",
		layout: "entries",
		icon: GraduationCapIcon,
		isUnique: true,
	},
	{
		id: "skills",
		title: "Habilidades",
		description: "Stack técnico y competencias agrupadas por categoría.",
		layout: "skills",
		icon: WrenchIcon,
		isUnique: true,
	},
	{
		id: "languages",
		title: "Idiomas",
		description: "Idiomas que dominas con su nivel de proficiencia.",
		layout: "skills",
		icon: TranslateIcon,
		isUnique: true,
	},
	{
		id: "certifications",
		title: "Certificaciones",
		description: "Credenciales y certificados profesionales relevantes.",
		layout: "entries",
		icon: CertificateIcon,
		isUnique: true,
	},
	{
		id: "projects",
		title: "Proyectos",
		description: "Trabajos personales o profesionales que muestran tu impacto.",
		layout: "entries",
		icon: FolderSimpleIcon,
		isUnique: true,
	},
	{
		id: "volunteering",
		title: "Voluntariado",
		description: "Actividades sin fines de lucro y compromiso comunitario.",
		layout: "entries",
		icon: HandHeartIcon,
		isUnique: true,
	},
	{
		id: "custom",
		title: "Sección personalizada",
		description: "Crea una sección propia con el título que necesites.",
		layout: "entries",
		icon: NotePencilIcon,
		isUnique: false,
	},
];

const normalize = (value: string) => value.trim().toLowerCase();
let nextOptimisticBlockId = -1;
const optimisticBlockId = () => nextOptimisticBlockId--;
const getOptimisticTailPosition = (lastPosition?: string | null) => (lastPosition ? `${lastPosition}z` : "U");
const createStarterChildContent = (layout: SectionLayout) => {
	switch (layout) {
		case "freeform":
			return {
				blockType: "paragraph" as const,
				content: {
					text: "<p>Escribe aquí el contenido principal de esta sección.</p>",
					format: "html" as const,
					aiSuggested: false,
				},
			};
		case "skills":
			return {
				blockType: "skill_line" as const,
				content: {
					label: "Nueva categoria",
					category: "other" as const,
				},
			};
		default:
			return {
				blockType: "entry" as const,
				content: {
					title: "Nuevo elemento",
					subtitle: "Agrega puesto, institucion o proyecto",
					descriptor: "<p>Edita este elemento para añadir fechas, ubicación e impacto.</p>",
					descriptorFormat: "html" as const,
					entryStyle: "standard" as const,
					isCurrent: false,
				},
			};
	}
};

export const NewSectionSheet = () => {
	const params = Route.useParams();
	const resumeQuery = orpc.resumes.get.queryOptions({ input: { id: params.resumeId } });

	const { data } = useSuspenseQuery(orpc.resumes.get.queryOptions({ input: { id: params.resumeId } }));

	const createSection = useMutation(
		orpc.blocks.create.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: resumeQuery.queryKey });

				const previousResume = queryClient.getQueryData<typeof data>(resumeQuery.queryKey);

				if (!previousResume) {
					return { previousResume };
				}

				const now = constructNow(new Date());

				const starterChild =
					input.blockType === "section" ? createStarterChildContent(input.content.layout || "freeform") : null;

				const optimisticBlock: (typeof previousResume.blocks)[number] = {
					id: optimisticBlockId(),
					resumeId: input.resumeId,
					parentBlockId: input.parentBlockId ?? null,
					sourceBlockId: null,
					isHidden: false,
					version: 1,
					blockType: input.blockType,
					position: getOptimisticTailPosition(input.before),
					content: input.content,
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
				};

				const optimisticChild = starterChild
					? ({
							id: optimisticBlockId(),
							resumeId: input.resumeId,
							parentBlockId: optimisticBlock.id,
							sourceBlockId: null,
							isHidden: false,
							version: 1,
							blockType: starterChild.blockType,
							position: getOptimisticTailPosition(null),
							content: starterChild.content,
							createdAt: now,
							updatedAt: now,
							deletedAt: null,
						} satisfies (typeof previousResume.blocks)[number])
					: null;

				queryClient.setQueryData(resumeQuery.queryKey, {
					...previousResume,
					blocks:
						optimisticChild === null
							? [...previousResume.blocks, optimisticBlock]
							: [...previousResume.blocks, optimisticBlock, optimisticChild],
					activeBlockTypes: previousResume.activeBlockTypes.includes(input.blockType)
						? previousResume.activeBlockTypes
						: [...previousResume.activeBlockTypes, input.blockType],
				});

				return { previousResume };
			},
			onError: (error, _variables, context) => {
				toast.error(error.message || "No se pudo crear la sección.");

				if (context?.previousResume) {
					queryClient.setQueryData(resumeQuery.queryKey, context.previousResume);
				}
			},
			onSettled: async () => {
				await queryClient.invalidateQueries({ queryKey: resumeQuery.queryKey });
			},
		})
	);

	const parsedBlocks = mapParseBlocks(data.blocks);
	const usedTitles = new Set(
		parsedBlocks.filter((block) => block.blockType === "section").map((block) => normalize(block.content.title))
	);
	const topLevelBlocks = sortLexoPositions(
		parsedBlocks.filter((block) => block.parentBlockId === null),
		(block) => block.position
	);
	const lastTopLevelBlock = topLevelBlocks.at(-1) ?? null;

	const handleCreateSection = async (option: SectionOption) => {
		const defaultSection = blankResumeSections.find((section) => normalize(section.title) === normalize(option.title));
		const title = defaultSection?.title ?? option.title;

		const input: CreateBlockApiMutationInput = {
			resumeId: params.resumeId,
			parentBlockId: null,
			before: lastTopLevelBlock?.position ?? null,
			after: null,
			blockType: "section",
			content: {
				title,
				layout: option.layout,
				isCustom: option.id === "custom",
			},
		};

		await createSection.mutateAsync(input);
	};

	return (
		<Sheet>
			<Button render={<SheetTrigger />} variant="outline">
				<PlusCircleIcon />
				Agregar sección
			</Button>

			<SheetContent variant="inset">
				<SheetHeader>
					<SheetTitle>Nueva sección</SheetTitle>
					<SheetDescription>Escoge entre las secciones disponibles optimizadas para ATS</SheetDescription>
				</SheetHeader>

				<section className="overflow-y-scroll">
					<ItemGroup className="gap-2 px-4 pb-4">
						{SECTION_OPTIONS.map((option) => {
							const Icon = option.icon;
							const isDisabled = option.isUnique && usedTitles.has(normalize(option.title));

							return (
								<Item asChild key={option.id} size="sm" variant="outline">
									<button
										aria-disabled={isDisabled}
										className={
											isDisabled
												? "pointer-events-none text-left opacity-50"
												: "cursor-pointer text-left hover:bg-accent/50"
										}
										data-disabled={isDisabled}
										disabled={isDisabled || createSection.isPending}
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
												<CheckCircleIcon className="size-5 text-success" weight="fill" />
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
