"use client";

import { type BlockNode, getContactItemLabel, proseContentToHtml } from "@stackk-career/schemas/db/resume-blocks";
import { sortLexoPositions } from "@stackk-career/schemas/utils/lexographical";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Input } from "@/components/ui/input";
import { ResumeRichTextField } from "./resume-rich-text-field";
import { TimelineSection } from "./timeline-section";

interface ResumeDocumentEditorProps {
	blockIndexById: Map<number, number>;
	onBlockBlur: (blockId: number) => void;
	onFieldChange: (path: string, value: unknown) => void;
	onRichTextBlur: (blockId: number) => void;
	onRichTextChange: (input: {
		blockId: number;
		formatPath: string;
		formatValue: string;
		path: string;
		value: string;
	}) => void;
	rootBlocks: BlockNode[];
}

const contactKinds = ["address", "email", "phone", "linkedin", "website", "other"] as const;

const proficiencyOptions = [
	"basic",
	"conversational",
	"fluent",
	"native",
	"beginner",
	"intermediate",
	"advanced",
	"expert",
] as const;

const categoryOptions = ["technical", "languages", "laboratory", "interests", "certifications", "other"] as const;

const fieldPath = (blockIndex: number, contentPath: string) => `blocks[${blockIndex}].content.${contentPath}`;

const renderInput = ({
	className,
	label,
	onBlur,
	onChange,
	placeholder,
	type = "text",
	variant = "ghost",
	value,
}: {
	className?: string;
	label: string;
	onBlur: () => void;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: "text" | "month";
	variant?: "default" | "ghost";
	value: string;
}) => (
	<label className="flex min-w-0 flex-col gap-1">
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
		<Input
			className={className}
			nativeInput
			onBlur={onBlur}
			onChange={(event) => {
				onChange(event.currentTarget.value);
			}}
			placeholder={placeholder}
			type={type}
			value={value}
			variant={variant}
		/>
	</label>
);

const renderSelect = ({
	label,
	onBlur,
	onChange,
	options,
	value,
}: {
	label: string;
	onBlur: () => void;
	onChange: (value: string) => void;
	options: readonly string[];
	value: string;
}) => (
	<label className="flex min-w-0 flex-col gap-1">
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
		<select
			className="min-h-8 rounded-lg border border-transparent bg-transparent px-2 text-sm outline-none hover:border-input focus:border-ring focus:ring-[3px] focus:ring-ring/24"
			onBlur={onBlur}
			onChange={(event) => {
				onChange(event.currentTarget.value);
			}}
			value={value}
		>
			{options.map((option) => (
				<option key={option} value={option}>
					{option}
				</option>
			))}
		</select>
	</label>
);

const ContactEditor = ({
	block,
	blockIndexById,
	onBlockBlur,
	onFieldChange,
}: Pick<ResumeDocumentEditorProps, "blockIndexById" | "onBlockBlur" | "onFieldChange"> & {
	block: BlockNode;
}) => {
	if (block.blockType !== "contact") {
		return null;
	}

	const blockIndex = blockIndexById.get(block.id);

	if (blockIndex === undefined) {
		return null;
	}

	return (
		<Frame>
			<FrameHeader>
				<div className="grid gap-2 md:grid-cols-2">
					{renderInput({
						className: "px-0 font-semibold text-xl sm:text-lg",
						label: "Nombre",
						onBlur: () => onBlockBlur(block.id),
						onChange: (value) => onFieldChange(fieldPath(blockIndex, "firstName"), value),
						value: block.content.firstName,
					})}
					{renderInput({
						className: "px-0 font-semibold text-xl sm:text-lg",
						label: "Apellido",
						onBlur: () => onBlockBlur(block.id),
						onChange: (value) => onFieldChange(fieldPath(blockIndex, "lastName"), value),
						value: block.content.lastName,
					})}
				</div>
				<FrameDescription>Información de contacto</FrameDescription>
			</FrameHeader>
			<FramePanel>
				<ul className="grid gap-2 md:grid-cols-3">
					{block.content.items.map((item, itemIndex) => (
						<li className="grid gap-1 rounded-full border bg-background px-3 py-2" key={`${item.kind}-${itemIndex}`}>
							{renderSelect({
								label: "Tipo",
								onBlur: () => onBlockBlur(block.id),
								onChange: (value) => onFieldChange(fieldPath(blockIndex, `items[${itemIndex}].kind`), value),
								options: contactKinds,
								value: item.kind,
							})}
							{renderInput({
								label: "Etiqueta",
								onBlur: () => onBlockBlur(block.id),
								onChange: (value) => onFieldChange(fieldPath(blockIndex, `items[${itemIndex}].label`), value),
								placeholder: getContactItemLabel(item.kind, item.label),
								value: item.label ?? "",
							})}
							{renderInput({
								label: "Valor",
								onBlur: () => onBlockBlur(block.id),
								onChange: (value) => onFieldChange(fieldPath(blockIndex, `items[${itemIndex}].value`), value),
								value: item.value,
							})}
						</li>
					))}
				</ul>
			</FramePanel>
		</Frame>
	);
};

const ParagraphEditor = ({
	block,
	blockIndexById,
	onRichTextBlur,
	onRichTextChange,
	placeholder,
	toolbar,
}: Pick<ResumeDocumentEditorProps, "blockIndexById" | "onRichTextBlur" | "onRichTextChange"> & {
	block: BlockNode;
	placeholder: string;
	toolbar: "prose" | "short";
}) => {
	if (block.blockType !== "paragraph") {
		return null;
	}

	const blockIndex = blockIndexById.get(block.id);

	if (blockIndex === undefined) {
		return null;
	}

	return (
		<ResumeRichTextField
			editorKey={`${block.id}-${new Date(block.updatedAt).getTime()}`}
			onBlur={() => onRichTextBlur(block.id)}
			onChange={(value) => {
				onRichTextChange({
					blockId: block.id,
					formatPath: fieldPath(blockIndex, "format"),
					formatValue: "html",
					path: fieldPath(blockIndex, "text"),
					value,
				});
			}}
			placeholder={placeholder}
			toolbar={toolbar}
			value={proseContentToHtml(block.content.text, block.content.format)}
		/>
	);
};

const BulletEditor = ({
	block,
	blockIndexById,
	onRichTextBlur,
	onRichTextChange,
}: Pick<ResumeDocumentEditorProps, "blockIndexById" | "onRichTextBlur" | "onRichTextChange"> & {
	block: BlockNode;
}) => {
	if (block.blockType !== "bullet") {
		return null;
	}

	const blockIndex = blockIndexById.get(block.id);

	if (blockIndex === undefined) {
		return null;
	}

	return (
		<li className="pl-1">
			<ResumeRichTextField
				editorKey={`${block.id}-${new Date(block.updatedAt).getTime()}`}
				onBlur={() => onRichTextBlur(block.id)}
				onChange={(value) => {
					onRichTextChange({
						blockId: block.id,
						formatPath: fieldPath(blockIndex, "format"),
						formatValue: "html",
						path: fieldPath(blockIndex, "text"),
						value,
					});
				}}
				placeholder="Describe impacto o logro"
				toolbar="short"
				value={proseContentToHtml(block.content.text, block.content.format)}
			/>
		</li>
	);
};

const EntryEditor = ({
	block,
	blockIndexById,
	onBlockBlur,
	onFieldChange,
	onRichTextBlur,
	onRichTextChange,
}: Pick<
	ResumeDocumentEditorProps,
	"blockIndexById" | "onBlockBlur" | "onFieldChange" | "onRichTextBlur" | "onRichTextChange"
> & {
	block: BlockNode;
}) => {
	if (block.blockType !== "entry") {
		return null;
	}

	const blockIndex = blockIndexById.get(block.id);

	if (blockIndex === undefined) {
		return null;
	}

	const bullets = sortLexoPositions(
		block.children.filter((child) => child.blockType === "bullet"),
		(child) => child.position
	);
	const paragraphs = sortLexoPositions(
		block.children.filter((child) => child.blockType === "paragraph"),
		(child) => child.position
	);

	return (
		<li className="space-y-3 pl-2">
			<div className="grid gap-3 md:grid-cols-2">
				{renderInput({
					className: "px-0 font-semibold text-base",
					label: "Título",
					onBlur: () => onBlockBlur(block.id),
					onChange: (value) => onFieldChange(fieldPath(blockIndex, "title"), value),
					value: block.content.title,
				})}
				{renderInput({
					className: "px-0 text-muted-foreground",
					label: "Subtítulo",
					onBlur: () => onBlockBlur(block.id),
					onChange: (value) => onFieldChange(fieldPath(blockIndex, "subtitle"), value),
					value: block.content.subtitle ?? "",
				})}
				{renderInput({
					label: "Ubicación",
					onBlur: () => onBlockBlur(block.id),
					onChange: (value) => onFieldChange(fieldPath(blockIndex, "location"), value),
					value: block.content.location ?? "",
				})}
				<div className="grid grid-cols-2 gap-3">
					{renderInput({
						label: "Inicio",
						onBlur: () => onBlockBlur(block.id),
						onChange: (value) => onFieldChange(fieldPath(blockIndex, "startDate"), value),
						type: "month",
						value: block.content.startDate ?? "",
					})}
					{renderInput({
						label: "Fin",
						onBlur: () => onBlockBlur(block.id),
						onChange: (value) => onFieldChange(fieldPath(blockIndex, "endDate"), value || null),
						type: "month",
						value: block.content.endDate ?? "",
					})}
				</div>
			</div>

			<label className="flex items-center gap-2 text-sm">
				<input
					checked={block.content.isCurrent}
					onBlur={() => onBlockBlur(block.id)}
					onChange={(event) => {
						onFieldChange(fieldPath(blockIndex, "isCurrent"), event.currentTarget.checked);
					}}
					type="checkbox"
				/>
				<span>Posición actual</span>
			</label>

			<div className="space-y-2">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Descripción</p>
				<ResumeRichTextField
					editorKey={`${block.id}-${new Date(block.updatedAt).getTime()}`}
					onBlur={() => onRichTextBlur(block.id)}
					onChange={(value) => {
						onRichTextChange({
							blockId: block.id,
							formatPath: fieldPath(blockIndex, "descriptorFormat"),
							formatValue: "html",
							path: fieldPath(blockIndex, "descriptor"),
							value,
						});
					}}
					placeholder="Describe alcance, contexto o impacto"
					toolbar="prose"
					value={proseContentToHtml(block.content.descriptor ?? "", block.content.descriptorFormat)}
				/>
			</div>

			{bullets.length > 0 ? (
				<ul className="space-y-2 pl-3">
					{bullets.map((bullet) => (
						<BulletEditor
							block={bullet}
							blockIndexById={blockIndexById}
							key={bullet.id}
							onRichTextBlur={onRichTextBlur}
							onRichTextChange={onRichTextChange}
						/>
					))}
				</ul>
			) : null}

			{paragraphs.length > 0 ? (
				<div className="space-y-2">
					{paragraphs.map((paragraph) => (
						<ParagraphEditor
							block={paragraph}
							blockIndexById={blockIndexById}
							key={paragraph.id}
							onRichTextBlur={onRichTextBlur}
							onRichTextChange={onRichTextChange}
							placeholder="Añade contexto adicional"
							toolbar="prose"
						/>
					))}
				</div>
			) : null}
		</li>
	);
};

const SkillsEditor = ({
	block,
	blockIndexById,
	onBlockBlur,
	onFieldChange,
}: Pick<ResumeDocumentEditorProps, "blockIndexById" | "onBlockBlur" | "onFieldChange"> & {
	block: BlockNode;
}) => {
	const lines = sortLexoPositions(
		block.children.filter((child) => child.blockType === "skill_line"),
		(child) => child.position
	);

	return (
		<div className="space-y-3">
			{lines.map((line) => {
				if (line.blockType !== "skill_line") {
					return null;
				}

				const lineIndex = blockIndexById.get(line.id);

				if (lineIndex === undefined) {
					return null;
				}

				const items = sortLexoPositions(
					line.children.filter((child) => child.blockType === "skill_item"),
					(child) => child.position
				);

				return (
					<div className="space-y-3 pl-2" key={line.id}>
						<div className="grid gap-3 md:grid-cols-2">
							{renderInput({
								className: "px-0 font-medium text-sm uppercase tracking-wide",
								label: "Categoría",
								onBlur: () => onBlockBlur(line.id),
								onChange: (value) => onFieldChange(fieldPath(lineIndex, "label"), value),
								value: line.content.label,
							})}
							{renderSelect({
								label: "Tipo",
								onBlur: () => onBlockBlur(line.id),
								onChange: (value) => onFieldChange(fieldPath(lineIndex, "category"), value),
								options: categoryOptions,
								value: line.content.category,
							})}
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							{items.map((item) => {
								if (item.blockType !== "skill_item") {
									return null;
								}

								const itemIndex = blockIndexById.get(item.id);

								if (itemIndex === undefined) {
									return null;
								}

								return (
									<div className="grid gap-2 rounded-lg border border-dashed p-3" key={item.id}>
										{renderInput({
											label: "Habilidad",
											onBlur: () => onBlockBlur(item.id),
											onChange: (value) => onFieldChange(fieldPath(itemIndex, "value"), value),
											value: item.content.value,
										})}
										{renderSelect({
											label: "Nivel",
											onBlur: () => onBlockBlur(item.id),
											onChange: (value) => onFieldChange(fieldPath(itemIndex, "proficiency"), value || undefined),
											options: proficiencyOptions,
											value: item.content.proficiency ?? "advanced",
										})}
									</div>
								);
							})}
						</div>
					</div>
				);
			})}
		</div>
	);
};

const SectionEditor = ({
	block,
	blockIndexById,
	onBlockBlur,
	onFieldChange,
	onRichTextBlur,
	onRichTextChange,
}: ResumeDocumentEditorProps & {
	block: BlockNode;
}) => {
	if (block.blockType !== "section") {
		return null;
	}

	const sectionIndex = blockIndexById.get(block.id);

	if (sectionIndex === undefined) {
		return null;
	}

	const paragraphs = sortLexoPositions(
		block.children.filter((child) => child.blockType === "paragraph"),
		(child) => child.position
	);
	const entries = sortLexoPositions(
		block.children.filter((child) => child.blockType === "entry"),
		(child) => child.position
	);

	return (
		<TimelineSection title={block.content.title}>
			<div className="space-y-4">
				<div className="max-w-sm">
					{renderInput({
						className: "px-0 font-medium text-muted-foreground text-xs uppercase tracking-wide",
						label: "Sección",
						onBlur: () => onBlockBlur(block.id),
						onChange: (value) => onFieldChange(fieldPath(sectionIndex, "title"), value),
						value: block.content.title,
					})}
				</div>

				{block.content.layout === "freeform" ? (
					<div className="space-y-2">
						{paragraphs.map((paragraph) => (
							<ParagraphEditor
								block={paragraph}
								blockIndexById={blockIndexById}
								key={paragraph.id}
								onRichTextBlur={onRichTextBlur}
								onRichTextChange={onRichTextChange}
								placeholder="Escribe contenido de sección"
								toolbar="prose"
							/>
						))}
					</div>
				) : null}

				{block.content.layout === "entries" ? (
					<ul className="space-y-4">
						{entries.map((entry) => (
							<EntryEditor
								block={entry}
								blockIndexById={blockIndexById}
								key={entry.id}
								onBlockBlur={onBlockBlur}
								onFieldChange={onFieldChange}
								onRichTextBlur={onRichTextBlur}
								onRichTextChange={onRichTextChange}
							/>
						))}
					</ul>
				) : null}

				{block.content.layout === "skills" ? (
					<SkillsEditor
						block={block}
						blockIndexById={blockIndexById}
						onBlockBlur={onBlockBlur}
						onFieldChange={onFieldChange}
					/>
				) : null}
			</div>
		</TimelineSection>
	);
};

export const ResumeDocumentEditor = ({
	blockIndexById,
	onBlockBlur,
	onFieldChange,
	onRichTextBlur,
	onRichTextChange,
	rootBlocks,
}: ResumeDocumentEditorProps) => {
	const contactBlock = rootBlocks.find((block) => block.blockType === "contact") ?? null;
	const sectionBlocks = rootBlocks.filter((block) => block.blockType === "section");

	return (
		<section className="flex w-full max-w-4xl flex-col gap-8 px-11">
			{contactBlock ? (
				<ContactEditor
					block={contactBlock}
					blockIndexById={blockIndexById}
					onBlockBlur={onBlockBlur}
					onFieldChange={onFieldChange}
				/>
			) : null}

			{sectionBlocks.length > 0 ? (
				<article className="space-y-6">
					{sectionBlocks.map((section) => (
						<SectionEditor
							block={section}
							blockIndexById={blockIndexById}
							key={section.id}
							onBlockBlur={onBlockBlur}
							onFieldChange={onFieldChange}
							onRichTextBlur={onRichTextBlur}
							onRichTextChange={onRichTextChange}
							rootBlocks={rootBlocks}
						/>
					))}
				</article>
			) : (
				<p className="text-muted-foreground text-sm">Este CV todavía no tiene secciones.</p>
			)}
		</section>
	);
};
