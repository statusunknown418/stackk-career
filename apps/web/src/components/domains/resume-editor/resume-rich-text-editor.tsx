"use client";

import { ListBulletsIcon, ListNumbersIcon, TextBolderIcon, TextItalicIcon } from "@phosphor-icons/react";
import { EditorContent, type Editor as TiptapEditor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "motion/react";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, GroupSeparator } from "@/components/ui/group";
import { cn } from "@/lib/utils";

interface ResumeRichTextEditorProps {
	onBlur?: () => void;
	onChange?: (value: string) => void;
	placeholder?: string;
	readOnly?: boolean;
	toolbar?: "prose" | "short";
	value: string;
}

interface ToolbarButtonProps {
	ariaLabel: string;
	disabled?: boolean;
	editor: TiptapEditor;
	icon: ReactNode;
	isActive?: boolean;
	onClick: () => void;
}

const preventEditorBlur = (event: MouseEvent<HTMLButtonElement>) => {
	event.preventDefault();
};

const ToolbarButton = ({
	ariaLabel,
	disabled = false,
	editor,
	icon,
	isActive = false,
	onClick,
}: ToolbarButtonProps) => (
	<Button
		aria-label={ariaLabel}
		className={cn(isActive && "bg-accent text-foreground")}
		disabled={disabled || !editor.isEditable}
		onClick={onClick}
		onMouseDown={preventEditorBlur}
		size="icon"
		variant="ghost"
	>
		{icon}
	</Button>
);

export const ResumeRichTextEditor = ({
	onBlur,
	onChange,
	placeholder,
	readOnly = false,
	toolbar = "prose",
	value,
}: ResumeRichTextEditorProps) => {
	const [isFocused, setIsFocused] = useState(false);

	const editor = useEditor({
		content: value,
		editable: !readOnly,
		editorProps: {
			attributes: {
				class:
					"min-h-20 whitespace-pre-wrap rounded-lg border p-2 text-sm text-foreground leading-relaxed outline-none transition-colors hover:bg-accent/50",
			},
		},
		extensions: [
			StarterKit.configure({
				bold: {},
				italic: {},
				blockquote: false,
				bulletList: {
					keepMarks: true,
					keepAttributes: false,
				},
				code: false,
				codeBlock: false,
				dropcursor: false,
				gapcursor: false,
				hardBreak: false,
				heading: false,
				horizontalRule: false,
				orderedList: {
					keepMarks: true,
					keepAttributes: false,
				},
				strike: false,
				undoRedo: false,
			}),
		],
		immediatelyRender: false,
		onBlur: () => {
			setIsFocused(false);
			onBlur?.();
		},
		onFocus: () => setIsFocused(true),
		onUpdate: ({ editor: currentEditor }) => {
			onChange?.(currentEditor.getHTML());
		},
	});

	// Sync external value changes into the editor without remounting. Skip when
	// the editor is focused so we never clobber active typing, and skip when the
	// HTML already matches to avoid setContent loops.
	useEffect(() => {
		if (!editor) {
			return;
		}
		if (editor.isFocused) {
			return;
		}
		if (editor.getHTML() === value) {
			return;
		}
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	if (!editor) {
		return (
			<div className="px-2 py-1.5">
				<p className="text-base text-muted-foreground leading-relaxed">{placeholder}</p>
			</div>
		);
	}

	const showToolbar = !readOnly && isFocused;

	return (
		<div className="relative">
			<EditorContent
				className={cn(
					"[&_.ProseMirror_li_p]:my-0 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
					readOnly && "pointer-events-none"
				)}
				editor={editor}
			/>

			{placeholder && editor.isEmpty && (
				<p className="pointer-events-none absolute top-1.5 left-2 text-muted-foreground/70 text-sm">{placeholder}</p>
			)}

			<AnimatePresence>
				{showToolbar && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2"
						exit={{ opacity: 0, y: -4 }}
						initial={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
					>
						<div className="rounded-xl border border-border/60 bg-popover p-0.5 shadow-md">
							<ButtonGroup>
								<ToolbarButton
									ariaLabel="Alternar negrita"
									editor={editor}
									icon={<TextBolderIcon />}
									isActive={editor.isActive("bold")}
									onClick={() => {
										editor.chain().focus().toggleBold().run();
									}}
								/>

								<GroupSeparator />

								<ToolbarButton
									ariaLabel="Alternar cursiva"
									editor={editor}
									icon={<TextItalicIcon />}
									isActive={editor.isActive("italic")}
									onClick={() => {
										editor.chain().focus().toggleItalic().run();
									}}
								/>

								<GroupSeparator />

								{toolbar === "prose" ? (
									<>
										<ToolbarButton
											ariaLabel="Alternar lista con viñetas"
											editor={editor}
											icon={<ListBulletsIcon />}
											isActive={editor.isActive("bulletList")}
											onClick={() => {
												editor.chain().focus().toggleBulletList().run();
											}}
										/>

										<GroupSeparator />

										<ToolbarButton
											ariaLabel="Alternar lista numerada"
											editor={editor}
											icon={<ListNumbersIcon />}
											isActive={editor.isActive("orderedList")}
											onClick={() => {
												editor.chain().focus().toggleOrderedList().run();
											}}
										/>
									</>
								) : null}
							</ButtonGroup>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
