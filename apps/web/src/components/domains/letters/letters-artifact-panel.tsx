"use client";

import {
	ArrowsClockwiseIcon,
	ChartBarIcon,
	CopyIcon,
	DownloadSimpleIcon,
	EnvelopeSimpleIcon,
	GlobeIcon,
	HeartIcon,
	type Icon,
	LinkedinLogoIcon,
	MapPinIcon,
	PhoneIcon,
	PlusIcon,
	SuitcaseSimpleIcon,
	TranslateIcon,
	TrashSimpleIcon,
	TriangleDashedIcon,
	XIcon,
} from "@phosphor-icons/react";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage, CoverLetterTemplateName } from "@stackk-career/schemas/api/letters";
import type { DeepPartial } from "ai";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { type LetterAccent, TEMPLATE_ACCENTS } from "./letter-accents";
import {
	allSectionsFilled,
	bodyToHtml,
	downloadCoverLetterPdf,
	EMPTY_SECTION_MESSAGE,
	formatCoverLetterAsText,
	toCompleteCoverLetter,
} from "./letters-artifact-utils";

/** Snapshot of the letter shown by the panel: content, active version and quota. Built by the route. */
export interface LetterView {
	/** Id of the artifact message currently shown (edits are saved to it). */
	activeMessageId: string | null;
	activeVersion: number;
	artifact: DeepPartial<CoverLetter> | undefined;
	currentLanguage: CoverLetterLanguage;
	generationCount: number;
	hasContent: boolean;
	maxVersions: number;
	template: CoverLetterTemplateName;
}

/** State of the in-flight CASEY run (or its error), shared by header, toolbar and body. */
export interface LetterRunState {
	error?: Error;
	isPending: boolean;
	isStreaming: boolean;
}

interface LettersArtifactPanelProps {
	className?: string;
	letter: LetterView;
	onRequestDelete: () => void;
	/** Persists manual user edits to the shown letter (not a regeneration). */
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

// Exponential ease-out for the body cross-fade (editable letter ↔ streaming view).
// Opacity only, never layout properties.
const PANEL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PANEL_FADE_DURATION = 0.22;

/**
 * In-place editable letter: each section is a TipTap (prose) editor, no separate edit mode.
 * Autosaves on blur via `onSaveArtifact` only when dirty. Mounted with `key = activeMessageId`,
 * so switching versions recreates it with the right content and a same-version save doesn't reset it.
 */
interface TemplateProps {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	draft: CoverLetter;
	preparing?: boolean;
	readOnly?: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
	todayDateStr: string;
	userEmail: string;
	userName: string;
}

function getLetterValues(
	draft: CoverLetter,
	userName: string,
	userEmail: string,
	todayDateStr: string,
	readOnly: boolean,
	preparing: boolean
) {
	return {
		contactAddressVal: draft.contactAddress || "",
		contactEmailVal: draft.contactEmail || userEmail,
		contactLinkedinVal: draft.contactLinkedin || "",
		contactNameVal: draft.contactName || userName,
		contactPhoneVal: draft.contactPhone || "",
		contactTitleVal: draft.contactTitle || "Carta de presentación",
		contactWebsiteVal: draft.contactWebsite || "",
		dateStrVal: draft.dateStr || todayDateStr,
		recipientAddressVal: draft.recipientAddress || "",
		recipientCompanyVal: draft.recipientCompany || "",
		recipientNameVal: draft.recipientName || "",
		showBodyLoader: readOnly && !draft.body && preparing,
		showClosingLoader: readOnly && !draft.closing && preparing,
		showGreetingLoader: readOnly && !draft.greeting && preparing,
		showSignatureLoader: readOnly && !draft.signature && preparing,
	};
}

interface RecipientBlockProps {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	draft: CoverLetter;
	readOnly: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
}

function RecipientBlock({ draft, readOnly, setField, commit }: RecipientBlockProps) {
	const hasRecipient = !!(draft.recipientName || draft.recipientCompany || draft.recipientAddress);

	if (!hasRecipient) {
		if (readOnly) {
			return null;
		}
		return (
			<button
				className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border border-dashed bg-muted/40 px-4 py-2 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
				onClick={() => {
					setField("recipientName", "Nombre del Reclutador");
					setField("recipientCompany", "Nombre de la Empresa");
					setField("recipientAddress", "Dirección de la Empresa");
					commit({
						recipientName: "Nombre del Reclutador",
						recipientCompany: "Nombre de la Empresa",
						recipientAddress: "Dirección de la Empresa",
					});
				}}
				type="button"
			>
				<PlusIcon className="size-4" />
				<span>Agregar destinatario</span>
			</button>
		);
	}

	return (
		<div className="group relative flex max-w-md flex-col gap-1 rounded border border-border bg-muted/30 p-3 text-left text-xs">
			{!readOnly && (
				<button
					aria-label="Eliminar destinatario"
					className="absolute top-1.5 right-1.5 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
					onClick={() => {
						setField("recipientName", "");
						setField("recipientCompany", "");
						setField("recipientAddress", "");
						commit({
							recipientName: "",
							recipientCompany: "",
							recipientAddress: "",
						});
					}}
					type="button"
				>
					<XIcon className="size-3" />
				</button>
			)}
			<span className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">Destinatario</span>
			<InlineTextEditor
				className="rounded px-1 font-medium text-foreground hover:bg-accent/40 focus:bg-accent/40"
				onBlur={commit}
				onChange={(value) => setField("recipientName", value)}
				placeholder="Nombre del Reclutador"
				readOnly={readOnly}
				value={draft.recipientName || ""}
				variant="plain"
			/>
			<InlineTextEditor
				className="rounded px-1 text-foreground/80 hover:bg-accent/40 focus:bg-accent/40"
				onBlur={commit}
				onChange={(value) => setField("recipientCompany", value)}
				placeholder="Nombre de la Empresa"
				readOnly={readOnly}
				value={draft.recipientCompany || ""}
				variant="plain"
			/>
			<InlineTextEditor
				className="rounded px-1 text-muted-foreground hover:bg-accent/40 focus:bg-accent/40"
				onBlur={commit}
				onChange={(value) => setField("recipientAddress", value)}
				placeholder="Dirección de la Empresa"
				readOnly={readOnly}
				value={draft.recipientAddress || ""}
				variant="plain"
			/>
		</div>
	);
}

interface SignatureBlockProps {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	draft: CoverLetter;
	preparing: boolean;
	readOnly: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
	template: CoverLetterTemplateName;
}

function SignatureBlock({ draft, readOnly, preparing, setField, commit, template }: SignatureBlockProps) {
	const showSignatureLoader = readOnly && !draft.signature && preparing;
	const editorial = template === "editorial";
	const accent = TEMPLATE_ACCENTS[template];

	return (
		<div className={cn("mt-6 flex flex-col pt-4", editorial ? "items-center text-center" : "items-start text-left")}>
			{showSignatureLoader ? (
				<Skeleton className="h-4 w-20 rounded-full" />
			) : (
				<InlineTextEditor
					className={cn(
						"rounded px-1 font-medium text-foreground hover:bg-accent/40 focus:bg-accent/40",
						editorial && "text-center font-serif text-lg",
						accent?.text
					)}
					onBlur={commit}
					onChange={(value) => setField("signature", value)}
					placeholder="Firma…"
					readOnly={readOnly}
					value={bodyToHtml(draft.signature)}
					variant="prose"
				/>
			)}
		</div>
	);
}

const SECTION_BODY_LOADER = (
	<div className="flex flex-col gap-2">
		<Skeleton className="h-3 w-full rounded-full" />
		<Skeleton className="h-3 w-11/12 rounded-full" />
		<Skeleton className="h-3 w-5/6 rounded-full" />
	</div>
);

interface HeaderProps {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	draft: CoverLetter;
	readOnly: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
	values: ReturnType<typeof getLetterValues>;
}

/** Icon + inline-editable contact value, used by the editorial (centered) letterhead. */
function ContactItem({
	commit,
	field,
	icon: IconComponent,
	placeholder,
	readOnly,
	setField,
	value,
}: {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	field: keyof CoverLetter;
	icon: Icon;
	placeholder: string;
	readOnly: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
	value: string;
}) {
	return (
		<span className="flex items-center gap-1.5">
			<IconComponent className="size-3.5 text-muted-foreground/80" />
			<InlineTextEditor
				className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
				onBlur={commit}
				onChange={(next) => setField(field, next)}
				placeholder={placeholder}
				readOnly={readOnly}
				value={value}
				variant="plain"
			/>
		</span>
	);
}

interface ContactDescriptor {
	field: keyof CoverLetter;
	icon: Icon;
	placeholder: string;
	value: string;
}

/**
 * Renders a row of contact fields joined by `separator`. Empty fields (and their separators)
 * are hidden in both modes, so a missing phone/address never leaves a dangling divider — and we
 * never seed fabricated contact data just to make the letterhead look complete.
 */
function ContactRow({
	className,
	commit,
	descriptors,
	readOnly,
	separator,
	setField,
	withIcon,
}: {
	className: string;
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	descriptors: readonly ContactDescriptor[];
	readOnly: boolean;
	separator: string;
	setField: (key: keyof CoverLetter, value: string) => void;
	withIcon: boolean;
}) {
	const visible = descriptors.filter((d) => d.value.trim().length > 0);
	if (visible.length === 0) {
		return null;
	}
	return (
		<div className={className}>
			{visible.map((descriptor, index) => (
				<Fragment key={descriptor.field}>
					{index > 0 && <span className="text-border">{separator}</span>}
					{withIcon ? (
						<ContactItem
							commit={commit}
							field={descriptor.field}
							icon={descriptor.icon}
							placeholder={descriptor.placeholder}
							readOnly={readOnly}
							setField={setField}
							value={descriptor.value}
						/>
					) : (
						<InlineTextEditor
							className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(next) => setField(descriptor.field, next)}
							placeholder={descriptor.placeholder}
							readOnly={readOnly}
							value={descriptor.value}
							variant="plain"
						/>
					)}
				</Fragment>
			))}
		</div>
	);
}

/** Editorial letterhead: centered, serif display name, icon-led contacts, hairline rule. */
function EditorialHeader({ commit, draft, readOnly, setField, values }: HeaderProps) {
	return (
		<div className="mb-8 flex flex-col items-center gap-2 text-center text-foreground">
			<InlineTextEditor
				className="rounded px-1.5 text-center font-serif text-4xl leading-tight hover:bg-accent/40 focus:bg-accent/40"
				onBlur={commit}
				onChange={(value) => setField("contactName", value)}
				placeholder="Tu Nombre"
				readOnly={readOnly}
				value={values.contactNameVal}
				variant="plain"
			/>
			{(!readOnly || draft.contactTitle) && (
				<InlineTextEditor
					className="rounded px-1.5 text-center text-muted-foreground text-xs uppercase tracking-[0.2em] hover:bg-accent/40 focus:bg-accent/40"
					onBlur={commit}
					onChange={(value) => setField("contactTitle", value)}
					placeholder="Título profesional"
					readOnly={readOnly}
					value={draft.contactTitle || ""}
					variant="plain"
				/>
			)}
			<ContactRow
				className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-sm"
				commit={commit}
				descriptors={[
					{
						field: "contactEmail",
						icon: EnvelopeSimpleIcon,
						placeholder: "tu.email@example.com",
						value: values.contactEmailVal,
					},
					{ field: "contactPhone", icon: PhoneIcon, placeholder: "Teléfono", value: values.contactPhoneVal },
					{ field: "contactAddress", icon: MapPinIcon, placeholder: "Ciudad, País", value: values.contactAddressVal },
				]}
				readOnly={readOnly}
				separator="|"
				setField={setField}
				withIcon
			/>
			<ContactRow
				className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-sm"
				commit={commit}
				descriptors={[
					{
						field: "contactLinkedin",
						icon: LinkedinLogoIcon,
						placeholder: "linkedin.com/in/usuario",
						value: values.contactLinkedinVal,
					},
					{
						field: "contactWebsite",
						icon: GlobeIcon,
						placeholder: "Sitio web o portafolio",
						value: values.contactWebsiteVal,
					},
				]}
				readOnly={readOnly}
				separator="|"
				setField={setField}
				withIcon
			/>
			<span className="mt-3 h-px w-16 bg-border" />
		</div>
	);
}

/** Left-aligned letterhead for `standard` and `modern`. `modern` adds tighter name tracking,
 * an uppercase role and a short accent rule in place of a full divider. */
function BlockHeader({ commit, draft, modern, readOnly, setField, values }: HeaderProps & { modern: boolean }) {
	return (
		<div className="mb-8 flex flex-col gap-1 text-left text-foreground">
			<InlineTextEditor
				className={cn(
					"rounded px-1.5 font-medium text-3xl leading-tight hover:bg-accent/40 focus:bg-accent/40",
					modern && "tracking-tight"
				)}
				onBlur={commit}
				onChange={(value) => setField("contactName", value)}
				placeholder="Tu Nombre"
				readOnly={readOnly}
				value={values.contactNameVal}
				variant="plain"
			/>
			{(!readOnly || draft.contactTitle) && (
				<InlineTextEditor
					className={cn(
						"rounded px-1.5 text-muted-foreground text-xs hover:bg-accent/40 focus:bg-accent/40",
						modern ? "uppercase tracking-wider" : "font-medium"
					)}
					onBlur={commit}
					onChange={(value) => setField("contactTitle", value)}
					placeholder="Título profesional"
					readOnly={readOnly}
					value={draft.contactTitle || ""}
					variant="plain"
				/>
			)}
			<ContactRow
				className="mt-1 flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm"
				commit={commit}
				descriptors={[
					{ field: "contactEmail", icon: EnvelopeSimpleIcon, placeholder: "Email", value: values.contactEmailVal },
					{ field: "contactPhone", icon: PhoneIcon, placeholder: "Teléfono", value: values.contactPhoneVal },
					{
						field: "contactLinkedin",
						icon: LinkedinLogoIcon,
						placeholder: "LinkedIn",
						value: values.contactLinkedinVal,
					},
					{ field: "contactAddress", icon: MapPinIcon, placeholder: "Dirección", value: values.contactAddressVal },
				]}
				readOnly={readOnly}
				separator="·"
				setField={setField}
				withIcon={false}
			/>
			{modern ? (
				<span className="mt-3 h-0.5 w-12 rounded-full bg-foreground/25" />
			) : (
				<div className="mt-2 w-full border-border border-b" />
			)}
		</div>
	);
}

/** Creative letterhead: a solid accent band carries a reversed-out name + role; contacts sit below. */
function CreativeHeader({ accent, commit, draft, readOnly, setField, values }: HeaderProps & { accent: LetterAccent }) {
	return (
		<div className="mb-8 flex flex-col gap-3 text-foreground">
			<div className={cn("flex flex-col gap-0.5 rounded-xl px-5 py-4", accent.band, accent.bandText)}>
				<InlineTextEditor
					className="rounded px-1 font-medium text-3xl leading-tight hover:bg-white/10 focus:bg-white/10"
					onBlur={commit}
					onChange={(value) => setField("contactName", value)}
					placeholder="Tu Nombre"
					readOnly={readOnly}
					value={values.contactNameVal}
					variant="plain"
				/>
				{(!readOnly || draft.contactTitle) && (
					<InlineTextEditor
						className={cn(
							"rounded px-1 text-sm uppercase tracking-wider hover:bg-white/10 focus:bg-white/10",
							accent.bandTextMuted
						)}
						onBlur={commit}
						onChange={(value) => setField("contactTitle", value)}
						placeholder="Título profesional"
						readOnly={readOnly}
						value={draft.contactTitle || ""}
						variant="plain"
					/>
				)}
			</div>
			<ContactRow
				className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-muted-foreground text-sm"
				commit={commit}
				descriptors={[
					{ field: "contactEmail", icon: EnvelopeSimpleIcon, placeholder: "Email", value: values.contactEmailVal },
					{ field: "contactPhone", icon: PhoneIcon, placeholder: "Teléfono", value: values.contactPhoneVal },
					{
						field: "contactLinkedin",
						icon: LinkedinLogoIcon,
						placeholder: "LinkedIn",
						value: values.contactLinkedinVal,
					},
					{ field: "contactAddress", icon: MapPinIcon, placeholder: "Dirección", value: values.contactAddressVal },
				]}
				readOnly={readOnly}
				separator="·"
				setField={setField}
				withIcon
			/>
		</div>
	);
}

/** Vibrant letterhead: a colored monogram tile of the candidate's initials beside the name. */
function VibrantHeader({ accent, commit, draft, readOnly, setField, values }: HeaderProps & { accent: LetterAccent }) {
	const initials =
		values.contactNameVal
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0]?.toUpperCase() ?? "")
			.join("") || "·";

	return (
		<div className="mb-8 flex items-center gap-4 text-foreground">
			<span
				aria-hidden="true"
				className={cn(
					"flex size-12 shrink-0 items-center justify-center rounded-xl font-medium text-lg leading-none",
					accent.band,
					accent.bandText
				)}
			>
				{initials}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
				<InlineTextEditor
					className="rounded px-1.5 font-medium text-3xl leading-tight hover:bg-accent/40 focus:bg-accent/40"
					onBlur={commit}
					onChange={(value) => setField("contactName", value)}
					placeholder="Tu Nombre"
					readOnly={readOnly}
					value={values.contactNameVal}
					variant="plain"
				/>
				{(!readOnly || draft.contactTitle) && (
					<InlineTextEditor
						className={cn(
							"rounded px-1.5 text-xs uppercase tracking-wider hover:bg-accent/40 focus:bg-accent/40",
							accent.text
						)}
						onBlur={commit}
						onChange={(value) => setField("contactTitle", value)}
						placeholder="Título profesional"
						readOnly={readOnly}
						value={draft.contactTitle || ""}
						variant="plain"
					/>
				)}
				<ContactRow
					className="mt-1 flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm"
					commit={commit}
					descriptors={[
						{ field: "contactEmail", icon: EnvelopeSimpleIcon, placeholder: "Email", value: values.contactEmailVal },
						{ field: "contactPhone", icon: PhoneIcon, placeholder: "Teléfono", value: values.contactPhoneVal },
						{
							field: "contactLinkedin",
							icon: LinkedinLogoIcon,
							placeholder: "LinkedIn",
							value: values.contactLinkedinVal,
						},
						{ field: "contactAddress", icon: MapPinIcon, placeholder: "Dirección", value: values.contactAddressVal },
					]}
					readOnly={readOnly}
					separator="·"
					setField={setField}
					withIcon={false}
				/>
			</div>
		</div>
	);
}

/** Picks the letterhead layout for the active template (typographic or accent-driven). */
function Letterhead({ template, ...headerProps }: HeaderProps & { template: CoverLetterTemplateName }) {
	const accent = TEMPLATE_ACCENTS[template];
	if (template === "editorial") {
		return <EditorialHeader {...headerProps} />;
	}
	if (template === "creative" && accent) {
		return <CreativeHeader {...headerProps} accent={accent} />;
	}
	if (template === "vibrant" && accent) {
		return <VibrantHeader {...headerProps} accent={accent} />;
	}
	return <BlockHeader {...headerProps} modern={template === "modern"} />;
}

/**
 * Single letter document, shared by the editable and read-only views. The `template` drives the
 * letterhead (typographic left/centered, or an accent band/bar) and the signature alignment +
 * accent; the body uses semantic tokens so it renders natively in light and dark mode, with no
 * hardcoded paper colors.
 */
function LetterDocument({
	commit,
	draft,
	preparing = false,
	readOnly = false,
	setField,
	template,
	todayDateStr,
	userEmail,
	userName,
}: TemplateProps & { template: CoverLetterTemplateName }) {
	const values = getLetterValues(draft, userName, userEmail, todayDateStr, readOnly, preparing);
	const headerProps: HeaderProps = { commit, draft, readOnly, setField, values };

	return (
		<>
			<Letterhead {...headerProps} template={template} />

			<div className="flex flex-col gap-6 text-foreground">
				<div className="flex justify-end">
					<InlineTextEditor
						className="rounded px-1.5 text-right text-muted-foreground/80 text-xs hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("dateStr", value)}
						placeholder="Fecha"
						readOnly={readOnly}
						value={values.dateStrVal}
						variant="plain"
					/>
				</div>

				<RecipientBlock commit={commit} draft={draft} readOnly={readOnly} setField={setField} />

				<div>
					{values.showGreetingLoader ? (
						<Skeleton className="h-4 w-32 rounded-full" />
					) : (
						<InlineTextEditor
							className="rounded px-1 font-medium text-foreground leading-snug hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("greeting", value)}
							placeholder="Saludo…"
							readOnly={readOnly}
							value={bodyToHtml(draft.greeting)}
							variant="prose"
						/>
					)}
				</div>

				<div>
					{values.showBodyLoader ? (
						SECTION_BODY_LOADER
					) : (
						<InlineTextEditor
							className="rounded px-1 text-foreground/90 leading-relaxed hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("body", value)}
							placeholder="Cuerpo de la carta…"
							readOnly={readOnly}
							value={bodyToHtml(draft.body)}
							variant="prose"
						/>
					)}
				</div>

				<div>
					{values.showClosingLoader ? (
						<Skeleton className="h-4 w-24 rounded-full" />
					) : (
						<InlineTextEditor
							className="rounded px-1 text-foreground/90 leading-relaxed hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("closing", value)}
							placeholder="Cierre…"
							readOnly={readOnly}
							value={bodyToHtml(draft.closing)}
							variant="prose"
						/>
					)}
				</div>

				<SignatureBlock
					commit={commit}
					draft={draft}
					preparing={preparing}
					readOnly={readOnly}
					setField={setField}
					template={template}
				/>
			</div>
		</>
	);
}

const trimCoverLetter = (letter: CoverLetter): CoverLetter => ({
	greeting: letter.greeting.trim(),
	body: letter.body.trim(),
	closing: letter.closing.trim(),
	signature: letter.signature.trim(),
	contactName: letter.contactName?.trim() || null,
	contactTitle: letter.contactTitle?.trim() || null,
	contactEmail: letter.contactEmail?.trim() || null,
	contactPhone: letter.contactPhone?.trim() || null,
	contactAddress: letter.contactAddress?.trim() || null,
	contactLinkedin: letter.contactLinkedin?.trim() || null,
	contactWebsite: letter.contactWebsite?.trim() || null,
	recipientName: letter.recipientName?.trim() || null,
	recipientCompany: letter.recipientCompany?.trim() || null,
	recipientAddress: letter.recipientAddress?.trim() || null,
	dateStr: letter.dateStr?.trim() || null,
});

function EditableLetter({
	activeMessageId,
	letter,
	onSaveArtifact,
	template,
	userName,
	userEmail,
	todayDateStr,
	onDraftChange,
}: {
	activeMessageId: string;
	letter: CoverLetter;
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	template: CoverLetterTemplateName;
	userName: string;
	userEmail: string;
	todayDateStr: string;
	onDraftChange?: (draft: CoverLetter) => void;
}) {
	const [draft, setDraft] = useState<CoverLetter>(letter);
	const dirtyRef = useRef(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		onDraftChange?.(draft);
	}, [draft, onDraftChange]);

	const setField = (key: keyof CoverLetter, value: string) => {
		dirtyRef.current = true;
		setDraft((prev) => ({ ...prev, [key]: value }));
	};

	const commit = async (overrideFields?: Partial<CoverLetter>) => {
		if (overrideFields) {
			dirtyRef.current = true;
		}
		if (!dirtyRef.current || saving) {
			return;
		}
		const activeDraft = overrideFields ? { ...draft, ...overrideFields } : draft;
		const trimmed = trimCoverLetter(activeDraft);
		if (!allSectionsFilled(trimmed)) {
			toast.error(EMPTY_SECTION_MESSAGE);
			return;
		}
		dirtyRef.current = false;
		setSaving(true);
		try {
			await onSaveArtifact(activeMessageId, trimmed);
		} catch {
			dirtyRef.current = true; // Retry on next blur; the route emits the toast.
		} finally {
			setSaving(false);
		}
	};

	const props: TemplateProps = {
		userName,
		userEmail,
		todayDateStr,
		draft,
		setField,
		commit,
		readOnly: false,
	};

	return (
		<section className="overflow-y-auto p-4">
			<div className="mx-auto w-full max-w-3xl">
				<article className="relative flex w-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow-sm md:p-12">
					<LetterDocument {...props} template={template} />
				</article>
			</div>
		</section>
	);
}

interface RegeneratePreset {
	description: string;
	extraPrompt: string | undefined;
	icon: Icon;
	label: string;
	/** When set, also persists the language switch on the generation. */
	language?: CoverLetterLanguage;
	/** When set, the preset only shows when the current letter is in this language. */
	onlyIfCurrentLanguage?: CoverLetterLanguage;
}

const REGENERATE_PRESETS: readonly RegeneratePreset[] = [
	{
		description: "Más respetuosa, sin informalidades.",
		extraPrompt: "Haz la carta más formal y respetuosa. Quita cualquier informalidad o coloquialismo.",
		icon: SuitcaseSimpleIcon,
		label: "Más formal",
	},
	{
		description: "Métricas y resultados específicos del CV.",
		extraPrompt:
			"Haz la carta más concreta. Cita métricas, stacks o resultados específicos del CV en cada párrafo del cuerpo.",
		icon: ChartBarIcon,
		label: "Más concreta",
	},
	{
		description: "Tono más cercano sin perder profesionalismo.",
		extraPrompt: "Haz la carta más cálida y personal sin perder profesionalismo. Suaviza el cuerpo y el cierre.",
		icon: HeartIcon,
		label: "Más cálida",
	},
	// Language switch presets. Only the opposite language is shown; the preset persists the
	// switch in generations.language AND fires the run so the model starts with the new
	// language's system prompt (extraPrompt alone is not enough — the system prompt wins).
	{
		description: "Traduce esta carta y genera las próximas versiones en inglés.",
		extraPrompt: "Reescribe la carta completa en inglés (American English) manteniendo el mismo contenido.",
		icon: TranslateIcon,
		label: "En inglés",
		language: "en",
		onlyIfCurrentLanguage: "es",
	},
	{
		description: "Traduce esta carta y genera las próximas versiones en español.",
		extraPrompt: "Reescribe la carta completa en español (peruano neutro profesional) manteniendo el mismo contenido.",
		icon: TranslateIcon,
		label: "En español",
		language: "es",
		onlyIfCurrentLanguage: "en",
	},
] as const;

interface ArtifactToolbarProps {
	latestDraftRef: RefObject<CoverLetter | null>;
	letter: LetterView;
	onRequestDelete: () => void;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

/** Header buttons: copy / download PDF / regenerate. (Editing is inline, no button.) */
function ArtifactToolbar({ latestDraftRef, letter, onRequestDelete, onTriggerAsync, run }: ArtifactToolbarProps) {
	const { artifact, currentLanguage, generationCount, hasContent, maxVersions, template } = letter;
	const { data: session } = authClient.useSession();
	const userName = session?.user?.name || "Tu Nombre";
	const userEmail = session?.user?.email || "tu.email@example.com";
	const [popoverOpen, setPopoverOpen] = useState(false);

	// Presence check only — the actual text conversion happens inside the click handlers
	// (it touches the DOM, which is unavailable during SSR).
	const canExport = toCompleteCoverLetter(artifact) !== null && !run.isPending;
	const canRegenerate = hasContent && !run.isPending;

	const visiblePresets = REGENERATE_PRESETS.filter(
		(p) => !p.onlyIfCurrentLanguage || p.onlyIfCurrentLanguage === currentLanguage
	);

	const handleRegenerate = async (preset: RegeneratePreset) => {
		setPopoverOpen(false);
		try {
			await onTriggerAsync({ extraPrompt: preset.extraPrompt, language: preset.language });
		} catch {
			// Toast already emitted by the route.
		}
	};

	const handleCopy = async () => {
		const targetLetter = latestDraftRef.current || toCompleteCoverLetter(artifact);
		if (!targetLetter) {
			return;
		}
		const formattedText = formatCoverLetterAsText(targetLetter);
		if (!formattedText) {
			return;
		}
		try {
			await navigator.clipboard.writeText(formattedText);
			toast.success("Carta copiada al portapapeles");
		} catch {
			toast.error("No pudimos copiar al portapapeles");
		}
	};

	const handleDownload = () => {
		const targetLetter = latestDraftRef.current || toCompleteCoverLetter(artifact);
		if (!targetLetter) {
			return;
		}
		try {
			downloadCoverLetterPdf(targetLetter, template, userName, userEmail);
			toast.success("Carta descargada como PDF");
		} catch {
			toast.error("No se pudo generar el PDF");
		}
	};

	return (
		<div className="flex items-center gap-1.5" data-tour-step-id="letter-toolbar">
			{hasContent && (
				<Group>
					<Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
						<PopoverTrigger
							render={
								<Button
									aria-label="Regenerar carta"
									disabled={!canRegenerate}
									onClick={(e) => {
										// At the limit, skip the popover: fire onTriggerAsync without a preset,
										// which detects the cap and shows the limit dialog.
										if (generationCount >= maxVersions) {
											e.preventDefault();
											e.stopPropagation();
											onTriggerAsync({});
										}
									}}
									size="sm"
									type="button"
									variant="outline"
								>
									<ArrowsClockwiseIcon
										className={cn((run.isPending || run.isStreaming) && "animate-spin")}
										weight="bold"
									/>
									Regenerar
								</Button>
							}
						/>
						<PopoverPopup align="end" className="w-72">
							<div className="flex flex-col gap-1">
								<p className="px-2 pt-1 pb-2 font-medium text-xs uppercase tracking-wide">Tono</p>
								{visiblePresets.map((preset) => {
									const PresetIcon = preset.icon;
									return (
										<button
											className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
											disabled={!canRegenerate}
											key={preset.label}
											onClick={() => handleRegenerate(preset)}
											type="button"
										>
											<PresetIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" weight="bold" />
											<span className="flex flex-col gap-0.5">
												<span className="font-medium">{preset.label}</span>
												<span className="text-muted-foreground text-xs">{preset.description}</span>
											</span>
										</button>
									);
								})}
							</div>
						</PopoverPopup>
					</Popover>

					<GroupSeparator />

					<Button
						aria-label="Copiar al portapapeles"
						disabled={!canExport}
						onClick={handleCopy}
						size="icon-sm"
						type="button"
						variant="outline"
					>
						<CopyIcon weight="bold" />
					</Button>

					<GroupSeparator />

					<Button
						aria-label="Descargar como PDF"
						disabled={!canExport}
						onClick={handleDownload}
						size="icon-sm"
						type="button"
						variant="outline"
					>
						<DownloadSimpleIcon weight="bold" />
					</Button>
				</Group>
			)}

			<Button
				aria-label="Eliminar carta"
				onClick={onRequestDelete}
				size="sm"
				type="button"
				variant="destructive-outline"
			>
				<TrashSimpleIcon weight="bold" />
				Eliminar
			</Button>
		</div>
	);
}

/** Read-only letter view: during CASEY streaming or for display without editing. */
function ReadOnlyLetter({
	artifact,
	preparing,
	showLoaders,
	template,
	userName,
	userEmail,
	todayDateStr,
}: {
	artifact: DeepPartial<CoverLetter> | undefined;
	/** Generating but no content yet: show a friendly message above the skeleton. */
	preparing: boolean;
	showLoaders: boolean;
	template: CoverLetterTemplateName;
	userName: string;
	userEmail: string;
	todayDateStr: string;
}) {
	const emptyDraft: CoverLetter = {
		greeting: "",
		body: "",
		closing: "",
		signature: "",
		contactName: null,
		contactTitle: null,
		contactEmail: null,
		contactPhone: null,
		contactAddress: null,
		contactLinkedin: null,
		contactWebsite: null,
		recipientName: null,
		recipientCompany: null,
		recipientAddress: null,
		dateStr: null,
	};

	const draft: CoverLetter = {
		...emptyDraft,
		...artifact,
	};

	const props: TemplateProps = {
		userName,
		userEmail,
		todayDateStr,
		draft,
		setField: () => {
			/* No-op in read-only mode */
		},
		commit: () => {
			/* No-op in read-only mode */
		},
		readOnly: true,
		preparing: showLoaders,
	};

	return (
		<FramePanel className="flex flex-1 flex-col overflow-y-auto bg-muted/35 p-6">
			<div className="mx-auto w-full max-w-3xl">
				{preparing && (
					<p className="mb-4 px-1 text-muted-foreground text-sm">
						<Shimmer>CASEY está leyendo tu CV y redactando tu carta…</Shimmer>
					</p>
				)}

				<article className="relative flex w-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow-sm md:p-10">
					<LetterDocument {...props} template={template} />
				</article>
			</div>
		</FramePanel>
	);
}

/**
 * Right pane of /dash/letters/$generationId — renders the cover-letter artifact.
 *
 * Mirrors the visual language of the CV-analysis panels (setup.analysis/resume-analysis.tsx
 * and resume-editor/resume-analysis-panel.tsx): a `Frame` with status badge in the header,
 * `Shimmer` for active streaming, `Skeleton` for unstarted sections, `Alert` for errors.
 * Inherits the app's neutral palette (bg-background / bg-card) — no landing tokens.
 *
 * Header buttons (top-right):
 *   - Copy (clipboard, plain text) — disabled while streaming or the letter is incomplete.
 *   - Download (PDF via jsPDF) — same.
 *   - "Regenerar" — popover with tone presets that fire a new run.
 */
export function LettersArtifactPanel({
	className,
	letter,
	onSaveArtifact,
	onTriggerAsync,
	onRequestDelete,
	run,
}: LettersArtifactPanelProps) {
	const latestDraftRef = useRef<CoverLetter | null>(null);
	const { data: session } = authClient.useSession();
	const userName = session?.user?.name || "Tu Nombre";
	const userEmail = session?.user?.email || "tu.email@example.com";
	const todayDateStr = format(new Date(), "PPP", { locale: es });

	const { activeMessageId, activeVersion, artifact, hasContent, maxVersions } = letter;
	const { error, isPending } = run;
	// Show skeletons for the whole generation (including the pre-stream window while CASEY reads
	// the CV), not just while streaming — no cold gap between trigger and first chunk.
	const showLoaders = !error && isPending;
	const hasStreamedContent = Boolean(artifact);
	// Generating but no new content yet (first draft or pre-first-chunk gap): show the friendly
	// message. On a regeneration `artifact` still holds the previous letter, so `preparing` is
	// false and the old letter stays visible until the stream starts.
	const preparing = showLoaders && !hasStreamedContent;

	const reduceMotion = useReducedMotion();
	const panelTransition = { duration: reduceMotion ? 0 : PANEL_FADE_DURATION, ease: PANEL_EASE };

	// Current complete letter (all 4 sections present). When complete and not generating, it is
	// shown editable in place (autosave on blur, no version consumed). `!isPending` avoids
	// remounting the editor during the pre-stream window.
	const completeLetter = toCompleteCoverLetter(artifact);
	const canEditInline = Boolean(completeLetter) && !isPending && Boolean(activeMessageId);

	// Body cross-fade between editable letter and streaming view. The per-mode `key` lets
	// AnimatePresence orchestrate the dissolve.
	let body: ReactNode = null;
	if (canEditInline && completeLetter && activeMessageId) {
		body = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex min-h-0 flex-1 flex-col overscroll-y-none"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="editable"
				transition={panelTransition}
			>
				<EditableLetter
					activeMessageId={activeMessageId}
					key={activeMessageId}
					letter={completeLetter}
					onDraftChange={(d) => {
						latestDraftRef.current = d;
					}}
					onSaveArtifact={onSaveArtifact}
					template={letter.template}
					todayDateStr={todayDateStr}
					userEmail={userEmail}
					userName={userName}
				/>
			</motion.div>
		);
	} else if (hasStreamedContent || showLoaders) {
		body = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex min-h-0 flex-1 flex-col overscroll-y-none"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="readonly"
				transition={panelTransition}
			>
				<ReadOnlyLetter
					artifact={artifact}
					preparing={preparing}
					showLoaders={showLoaders}
					template={letter.template}
					todayDateStr={todayDateStr}
					userEmail={userEmail}
					userName={userName}
				/>
			</motion.div>
		);
	}

	return (
		<Frame className={className ?? "h-full min-h-0"} data-tour-step-id="letter-artifact">
			<FrameHeader className="flex-row items-start justify-between gap-3 py-1!">
				<div className="flex flex-col gap-1.5">
					<FrameDescription>
						{error && <Badge variant="secondary">Error</Badge>}
						{!(error || isPending) && hasContent && (
							<Badge variant="secondary">
								Versión {activeVersion}/{maxVersions}
							</Badge>
						)}
						{!(error || isPending || hasContent) && <Badge variant="secondary">Lista para empezar</Badge>}
					</FrameDescription>

					<FrameDescription>
						Puedes editar cualquier texto haciendo click! Todo se guarda automaticamente
					</FrameDescription>
				</div>

				<ArtifactToolbar
					latestDraftRef={latestDraftRef}
					letter={letter}
					onRequestDelete={onRequestDelete}
					onTriggerAsync={onTriggerAsync}
					run={run}
				/>
			</FrameHeader>

			<AnimatePresence initial={false} mode="popLayout">
				{body}
			</AnimatePresence>

			{error && (
				<Alert className="mt-4" variant="error">
					<TriangleDashedIcon />
					<AlertTitle>No pudimos completar la carta</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			)}
		</Frame>
	);
}
