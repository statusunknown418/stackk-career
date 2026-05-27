"use client";

import { ListBulletsIcon, ListNumbersIcon, TextBolderIcon, TextItalicIcon } from "@phosphor-icons/react";
import type { SuggestResumeBlockInput } from "@stackk-career/schemas/api/suggestions";
import Placeholder from "@tiptap/extension-placeholder";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, GroupSeparator } from "@/components/ui/group";
import { cn } from "@/lib/utils";
import { SuggestionPopover } from "./suggestion-popover";

export type InlineTextEditorVariant = "prose" | "heading" | "subtitle" | "plain";

interface SuggestionConfig {
	input: SuggestResumeBlockInput;
	onApply: (html: string) => void;
}

interface InlineTextEditorProps {
	autoFocus?: boolean;
	className?: string;
	onBlur?: () => void;
	onChange: (value: string) => void;
	onEnterEmpty?: () => void;
	placeholder?: string;
	readOnly?: boolean;
	suggestion?: SuggestionConfig;
	value: string;
	variant: InlineTextEditorVariant;
}

const readEditorValue = (
	editor: { isEmpty: boolean; getHTML: () => string; getText: () => string },
	isProse: boolean
) => {
	if (!isProse) {
		return editor.getText();
	}
	if (editor.isEmpty) {
		return "";
	}
	return editor.getHTML();
};

export const InlineTextEditor = ({
	autoFocus = false,
	className,
	onBlur,
	onChange,
	onEnterEmpty,
	placeholder,
	readOnly = false,
	suggestion,
	value,
	variant,
}: InlineTextEditorProps) => {
	const [isFocused, setIsFocused] = useState(false);
	const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
	const isProse = variant === "prose";

	const editor = useEditor({
		autofocus: autoFocus ? "end" : false,
		content: value,
		editable: !readOnly,
		editorProps: {
			attributes: {
				class: cn(
					"rounded-sm px-1 py-0.5 outline-none transition-colors hover:bg-accent/60 focus:bg-accent/60",
					variant === "prose" && "min-h-6 whitespace-pre-wrap text-sm leading-relaxed",
					variant === "heading" && "text-xl leading-tight",
					variant === "subtitle" && "text-base leading-snug",
					variant === "plain" && "text-sm leading-snug",
					className
				),
			},
			handleKeyDown: (_view, event) => {
				if (event.key !== "Enter" || isProse) {
					return false;
				}
				event.preventDefault();
				if (editor?.isEmpty && onEnterEmpty) {
					onEnterEmpty();
					return true;
				}
				editor?.commands.blur();
				return true;
			},
		},
		extensions: [
			StarterKit.configure({
				blockquote: false,
				bold: isProse ? {} : false,
				bulletList: isProse ? { keepMarks: true, keepAttributes: false } : false,
				code: false,
				codeBlock: false,
				dropcursor: false,
				gapcursor: false,
				hardBreak: false,
				heading: false,
				horizontalRule: false,
				italic: isProse ? {} : false,
				orderedList: isProse ? { keepMarks: true, keepAttributes: false } : false,
				strike: false,
				undoRedo: false,
			}),
			Placeholder.configure({
				placeholder: placeholder ?? "",
				showOnlyWhenEditable: true,
				showOnlyCurrent: false,
				includeChildren: false,
			}),
		],
		immediatelyRender: false,
		onBlur: () => {
			setIsFocused(false);
			onBlur?.();
		},
		onFocus: () => setIsFocused(true),
		onUpdate: ({ editor: currentEditor }) => {
			onChange(readEditorValue(currentEditor, isProse));
		},
	});

	// Tiptap is imperative; only setContent can push external value into the view.
	// Skip while focused so we never clobber active typing; compare against the
	// variant's emission shape so we don't ping-pong setContent.
	useEffect(() => {
		if (!editor || editor.isFocused) {
			return;
		}
		if (readEditorValue(editor, isProse) === value) {
			return;
		}
		editor.commands.setContent(value || "", { emitUpdate: false });
	}, [editor, isProse, value]);

	if (!editor) {
		return null;
	}

	const showToolbar = isProse && !readOnly && (isFocused || isSuggestionOpen);

	return (
		<div className="relative">
			<EditorContent
				className={cn(
					"[&_.ProseMirror_.is-editor-empty]:before:pointer-events-none [&_.ProseMirror_.is-editor-empty]:before:float-left [&_.ProseMirror_.is-editor-empty]:before:h-0 [&_.ProseMirror_.is-editor-empty]:before:text-muted-foreground/60 [&_.ProseMirror_.is-editor-empty]:before:content-[attr(data-placeholder)]",
					isProse &&
						"[&_.ProseMirror_li_p]:my-0 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
					readOnly && "pointer-events-none"
				)}
				editor={editor}
			/>

			<AnimatePresence>
				{showToolbar && (
					<ProseToolbar editor={editor} onSuggestionOpenChange={setIsSuggestionOpen} suggestion={suggestion} />
				)}
			</AnimatePresence>
		</div>
	);
};

interface ProseToolbarProps {
	editor: Editor;
	onSuggestionOpenChange: (open: boolean) => void;
	suggestion?: SuggestionConfig;
}

const ProseToolbar = ({ editor, onSuggestionOpenChange, suggestion }: ProseToolbarProps) => (
	<motion.div
		animate={{ opacity: 1, y: 0 }}
		className="absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2"
		exit={{ opacity: 0, y: -4 }}
		initial={{ opacity: 0, y: -4 }}
		transition={{ duration: 0.15, ease: "easeOut" }}
	>
		<div className="rounded-lg border bg-popover shadow-md">
			<ButtonGroup>
				<Button
					aria-label="Alternar negrita"
					className={cn(editor.isActive("bold") && "bg-accent text-foreground")}
					onClick={() => editor.chain().focus().toggleBold().run()}
					onMouseDown={(event) => event.preventDefault()}
					size="icon-sm"
					variant="ghost"
				>
					<TextBolderIcon />
				</Button>
				<GroupSeparator />
				<Button
					aria-label="Alternar cursiva"
					className={cn(editor.isActive("italic") && "bg-accent text-foreground")}
					onClick={() => editor.chain().focus().toggleItalic().run()}
					onMouseDown={(event) => event.preventDefault()}
					size="icon-sm"
					variant="ghost"
				>
					<TextItalicIcon />
				</Button>
				<GroupSeparator />
				<Button
					aria-label="Alternar lista con viñetas"
					className={cn(editor.isActive("bulletList") && "bg-accent text-foreground")}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					onMouseDown={(event) => event.preventDefault()}
					size="icon-sm"
					variant="ghost"
				>
					<ListBulletsIcon />
				</Button>
				<GroupSeparator />
				<Button
					aria-label="Alternar lista numerada"
					className={cn(editor.isActive("orderedList") && "bg-accent text-foreground")}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					onMouseDown={(event) => event.preventDefault()}
					size="icon-sm"
					variant="ghost"
				>
					<ListNumbersIcon />
				</Button>
				{suggestion && (
					<>
						<GroupSeparator />
						<SuggestionPopover
							input={suggestion.input}
							onApply={suggestion.onApply}
							onOpenChange={onSuggestionOpenChange}
						/>
					</>
				)}
			</ButtonGroup>
		</div>
	</motion.div>
);
