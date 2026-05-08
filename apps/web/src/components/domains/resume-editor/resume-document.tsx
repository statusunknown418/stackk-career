import { type Block, mapParseBlocks, type ResumeBlockGenericType } from "@stackk-career/schemas/ai/resume-blocks";
import { ResumeRichTextField } from "./resume-rich-text-field";
import { TimelineSection } from "./timeline-section";

interface ResumeDocumentProps {
	blocks: ResumeBlockGenericType[];
}

type BlockNode = Block & { children: BlockNode[] };

const sortByPosition = <T extends { position: string }>(items: readonly T[]): T[] =>
	[...items].sort((left, right) => left.position.localeCompare(right.position));

const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const blockTextToHtml = (value: string): string => `<p>${escapeHtml(value)}</p>`;

const buildBlockTree = (blocks: ResumeBlockGenericType[]): BlockNode[] => {
	const parsedBlocks = sortByPosition(mapParseBlocks(blocks));
	const nodes = new Map<number, BlockNode>();

	for (const block of parsedBlocks) {
		nodes.set(block.id, {
			...block,
			children: [],
		});
	}

	const roots: BlockNode[] = [];

	for (const block of parsedBlocks) {
		const node = nodes.get(block.id);

		if (!node) {
			continue;
		}

		if (block.parentBlockId === null) {
			roots.push(node);
			continue;
		}

		const parent = nodes.get(block.parentBlockId);

		if (!parent) {
			roots.push(node);
			continue;
		}

		parent.children.push(node);
	}

	return roots;
};

const formatDateRange = (startDate?: string, endDate?: string | null, isCurrent?: boolean): string | null => {
	if (!(startDate || endDate || isCurrent)) {
		return null;
	}

	const endLabel = isCurrent ? "Actualidad" : (endDate ?? "");

	if (startDate && endLabel) {
		return `${startDate} - ${endLabel}`;
	}

	return startDate ?? (endLabel || null);
};

const getContactItemLabel = (kind: string, label?: string): string =>
	label ??
	{
		address: "Dirección",
		email: "Email",
		linkedin: "LinkedIn",
		other: "Otro",
		phone: "Teléfono",
		website: "Web",
	}[kind] ??
	kind;

const EmptySectionState = ({ message }: { message: string }) => (
	<p className="pl-2 text-muted-foreground text-sm">{message}</p>
);

const ContactHeader = ({ block }: { block: BlockNode }) => {
	if (block.blockType !== "contact") {
		return null;
	}

	const fullName = `${block.content.firstName} ${block.content.lastName}`.trim();

	return (
		<section className="rounded-2xl border bg-card px-5 py-4">
			<div className="space-y-1">
				<h2 className="font-semibold text-2xl tracking-tight">{fullName}</h2>
				<ul className="flex flex-wrap gap-2 text-muted-foreground text-sm">
					{block.content.items.map((item) => (
						<li className="rounded-full border bg-background px-3 py-1" key={`${item.kind}-${item.value}`}>
							<span className="font-medium text-foreground">{getContactItemLabel(item.kind, item.label)}:</span>{" "}
							<span>{item.value}</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
};

const ParagraphList = ({ paragraphs }: { paragraphs: BlockNode[] }) => {
	if (!paragraphs.length) {
		return <EmptySectionState message="Sin contenido todavía." />;
	}

	return (
		<div className="flex flex-col gap-3">
			{paragraphs.map((paragraph) =>
				paragraph.blockType === "paragraph" ? (
					<ResumeRichTextField initialContent={blockTextToHtml(paragraph.content.text)} key={paragraph.id} readOnly />
				) : null
			)}
		</div>
	);
};

const EntryBlock = ({ block }: { block: BlockNode }) => {
	if (block.blockType !== "entry") {
		return null;
	}

	const bullets = sortByPosition(block.children.filter((child) => child.blockType === "bullet"));
	const paragraphs = sortByPosition(block.children.filter((child) => child.blockType === "paragraph"));
	const dateRange = formatDateRange(block.content.startDate, block.content.endDate, block.content.isCurrent);

	return (
		<li className="space-y-3 pl-2" key={block.id}>
			<article className="space-y-2">
				<header className="space-y-1">
					<p className="font-semibold text-base text-foreground">{block.content.title}</p>

					{block.content.subtitle ? <p className="text-base text-muted-foreground">{block.content.subtitle}</p> : null}

					{block.content.descriptor ? (
						<p className="text-muted-foreground text-sm">{block.content.descriptor}</p>
					) : null}

					{dateRange || block.content.location ? (
						<p className="text-muted-foreground text-sm">
							{dateRange ? <span>{dateRange}</span> : null}
							{dateRange && block.content.location ? <span>{" · "}</span> : null}
							{block.content.location ? <span>{block.content.location}</span> : null}
						</p>
					) : null}
				</header>

				{bullets.length ? (
					<ul className="list-disc space-y-1 pl-5 text-foreground text-sm">
						{bullets.map((bullet) =>
							bullet.blockType === "bullet" ? <li key={bullet.id}>{bullet.content.text}</li> : null
						)}
					</ul>
				) : null}

				{paragraphs.length ? <ParagraphList paragraphs={paragraphs} /> : null}
			</article>
		</li>
	);
};

const EntriesSection = ({ blocks }: { blocks: BlockNode[] }) => {
	const entries = sortByPosition(blocks.filter((child) => child.blockType === "entry"));

	if (!entries.length) {
		return <EmptySectionState message="Sin entradas todavía." />;
	}

	return (
		<ul className="flex flex-col gap-6">
			{entries.map((entry) => (
				<EntryBlock block={entry} key={entry.id} />
			))}
		</ul>
	);
};

const SkillsSectionContent = ({ blocks }: { blocks: BlockNode[] }) => {
	const lines = sortByPosition(blocks.filter((child) => child.blockType === "skill_line"));

	if (!lines.length) {
		return <EmptySectionState message="Sin habilidades todavía." />;
	}

	return (
		<div className="flex flex-col gap-4">
			{lines.map((line) => {
				if (line.blockType !== "skill_line") {
					return null;
				}

				const items = sortByPosition(line.children.filter((child) => child.blockType === "skill_item"));

				return (
					<div className="space-y-2 pl-2" key={line.id}>
						<p className="font-medium text-sm uppercase tracking-wide">{line.content.label}</p>

						{items.length ? (
							<ul className="flex flex-wrap gap-2">
								{items.map((item) =>
									item.blockType === "skill_item" ? (
										<li className="rounded-full border bg-background px-3 py-1 text-sm" key={item.id}>
											<span>{item.content.value}</span>
											{item.content.proficiency ? (
												<span className="text-muted-foreground">{` · ${item.content.proficiency}`}</span>
											) : null}
										</li>
									) : null
								)}
							</ul>
						) : (
							<EmptySectionState message="Sin items todavía." />
						)}
					</div>
				);
			})}
		</div>
	);
};

const SectionContent = ({ block }: { block: BlockNode }) => {
	if (block.blockType !== "section") {
		return null;
	}

	const paragraphs = sortByPosition(block.children.filter((child) => child.blockType === "paragraph"));

	switch (block.content.layout) {
		case "freeform":
			return <ParagraphList paragraphs={paragraphs} />;
		case "entries":
			return <EntriesSection blocks={block.children} />;
		case "skills":
			return <SkillsSectionContent blocks={block.children} />;
		default:
			return <EmptySectionState message="Tipo de sección no soportado todavía." />;
	}
};

const ResumeSection = ({ block, isLast }: { block: BlockNode; isLast: boolean }) => {
	if (block.blockType !== "section") {
		return null;
	}

	return (
		<TimelineSection isLast={isLast} title={block.content.title}>
			<SectionContent block={block} />
		</TimelineSection>
	);
};

export const ResumeDocument = ({ blocks }: ResumeDocumentProps) => {
	const rootBlocks = buildBlockTree(blocks);
	const contactBlock = rootBlocks.find((block) => block.blockType === "contact") ?? null;
	const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

	return (
		<section className="flex w-full max-w-4xl flex-col gap-8 px-11">
			{contactBlock ? <ContactHeader block={contactBlock} /> : null}

			{sectionBlocks.length ? (
				<div className="flex flex-col gap-2">
					{sectionBlocks.map((block, index) => (
						<ResumeSection block={block} isLast={index === sectionBlocks.length - 1} key={block.id} />
					))}
				</div>
			) : (
				<EmptySectionState message="Este CV todavía no tiene secciones." />
			)}
		</section>
	);
};
