"use client";

import {
	ArrowsClockwiseIcon,
	ChartBarIcon,
	CopyIcon,
	DownloadSimpleIcon,
	EnvelopeSimpleIcon,
	GlobeIcon,
	HandWavingIcon,
	HeartIcon,
	type Icon,
	LinkedinLogoIcon,
	MapPinIcon,
	ParagraphIcon,
	PenNibIcon,
	PhoneIcon,
	PlusIcon,
	SealIcon,
	SuitcaseSimpleIcon,
	TranslateIcon,
	TriangleDashedIcon,
	XIcon,
} from "@phosphor-icons/react";
import type { CoverLetter } from "@stackk-career/schemas/ai/cover-letter";
import type { CoverLetterLanguage } from "@stackk-career/schemas/api/letters";
import type { DeepPartial } from "ai";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { InlineTextEditor } from "@/components/domains/resume-document/inline-text-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Frame, FrameDescription, FrameHeader, FramePanel } from "@/components/ui/frame";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { CoverLetterSection, type LetterSectionDef, LetterSectionShell } from "./cover-letter-section";
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
	template?: "centered" | "classic" | "minty" | "blue" | null;
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
	/** Persists manual user edits to the shown letter (not a regeneration). */
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

// Exponential ease-out for the body cross-fade (editable letter ↔ streaming view).
// Opacity only, never layout properties.
const PANEL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PANEL_FADE_DURATION = 0.22;

// `primary` = the dominant section (body), shown as a prominent Card; the rest stay compact
// so the letter has hierarchy.
const SECTION_DEFS = [
	{ icon: HandWavingIcon, key: "greeting", label: "Saludo", primary: false },
	{ icon: ParagraphIcon, key: "body", label: "Cuerpo", primary: true },
	{ icon: PenNibIcon, key: "closing", label: "Cierre", primary: false },
	{ icon: SealIcon, key: "signature", label: "Firma", primary: false },
] as const satisfies readonly LetterSectionDef[];

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
	userImage?: string;
	userLinkedin: string;
	userName: string;
	userPhone: string;
}

function getCenteredTemplateValues(
	draft: CoverLetter,
	userName: string,
	userEmail: string,
	userPhone: string,
	userLinkedin: string,
	todayDateStr: string,
	readOnly: boolean,
	preparing: boolean
) {
	return {
		contactAddressVal: draft.contactAddress || "Lima, Perú",
		contactEmailVal: draft.contactEmail || userEmail,
		contactLinkedinVal: draft.contactLinkedin || userLinkedin,
		contactNameVal: draft.contactName || userName,
		contactPhoneVal: draft.contactPhone || userPhone,
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
		showWebsite: draft.contactWebsite || draft.contactWebsite === "",
	};
}

interface RecipientBlockProps {
	commit: (overrideFields?: Partial<CoverLetter>) => void;
	draft: CoverLetter;
	readOnly: boolean;
	setField: (key: keyof CoverLetter, value: string) => void;
	theme: "classic" | "minty" | "blue" | "centered";
}

function RecipientBlock({ draft, readOnly, setField, commit, theme }: RecipientBlockProps) {
	const hasRecipient = !!(draft.recipientName || draft.recipientCompany || draft.recipientAddress);

	if (!hasRecipient) {
		if (readOnly) {
			return null;
		}
		return (
			<button
				className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-neutral-350 border-dashed bg-neutral-50/50 px-4 py-2 text-neutral-500 text-xs transition-all hover:border-neutral-450 hover:bg-neutral-100/50 hover:text-neutral-700"
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

	let labelColorClass = "text-muted-foreground font-medium text-[10px]";
	if (theme === "minty") {
		labelColorClass = "text-emerald-700 font-semibold";
	} else if (theme === "blue") {
		labelColorClass = "text-blue-600 font-semibold";
	}

	const containerClass =
		theme === "minty"
			? "relative group flex flex-col gap-1 rounded border border-border bg-muted/30 p-3 text-left text-xs"
			: "relative group flex max-w-md flex-col gap-1 rounded border border-border bg-muted/30 p-3 text-left text-xs";

	return (
		<div className={containerClass}>
			{!readOnly && (
				<button
					aria-label="Eliminar destinatario"
					className="absolute top-1.5 right-1.5 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-neutral-200 text-neutral-600 opacity-0 transition-opacity hover:bg-neutral-350 group-hover:opacity-100"
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
			<span className={`mb-1 uppercase tracking-wider ${labelColorClass}`}>Destinatario</span>
			<InlineTextEditor
				className="rounded px-1 font-semibold text-foreground hover:bg-accent/40 focus:bg-accent/40"
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
	theme: "classic" | "minty" | "blue" | "centered";
}

function SignatureBlock({ draft, readOnly, preparing, setField, commit, theme }: SignatureBlockProps) {
	const showSignatureLoader = readOnly && !draft.signature && preparing;

	let containerClass = "mt-6 flex flex-col items-start pt-4 text-left";
	if (theme === "centered") {
		containerClass = "mt-6 flex flex-col items-center pt-4 text-center";
	} else if (theme === "minty") {
		containerClass = "mt-6 flex flex-col items-start border-emerald-500/20 border-t pt-4 text-left";
	} else if (theme === "blue") {
		containerClass = "mt-6 flex flex-col items-start border-blue-500/10 border-t pt-4 text-left";
	}

	let editorClass = "rounded px-1 font-semibold text-foreground hover:bg-accent/40 focus:bg-accent/40";
	if (theme === "centered") {
		editorClass = "rounded px-1 text-center font-semibold text-foreground hover:bg-accent/40 focus:bg-accent/40";
	} else if (theme === "minty") {
		editorClass = "rounded px-1 font-semibold text-emerald-700 hover:bg-emerald-500/10 focus:bg-emerald-500/10";
	} else if (theme === "blue") {
		editorClass = "rounded px-1 font-semibold text-blue-600 hover:bg-blue-500/10 focus:bg-blue-500/10";
	}

	return (
		<div className={containerClass}>
			{showSignatureLoader ? (
				<Skeleton className="h-4 w-20 rounded-full" />
			) : (
				<InlineTextEditor
					className={editorClass}
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

function CenteredTemplateView({
	userName,
	userEmail,
	userPhone,
	userLinkedin,
	todayDateStr,
	draft,
	setField,
	commit,
	readOnly = false,
	preparing = false,
}: TemplateProps) {
	const {
		contactAddressVal,
		contactEmailVal,
		contactLinkedinVal,
		contactNameVal,
		contactPhoneVal,
		contactTitleVal,
		contactWebsiteVal,
		dateStrVal,
		showBodyLoader,
		showClosingLoader,
		showGreetingLoader,
		showWebsite,
	} = getCenteredTemplateValues(draft, userName, userEmail, userPhone, userLinkedin, todayDateStr, readOnly, preparing);

	return (
		<>
			{/* Candidate Header Information */}
			<div className="mb-6 flex flex-col gap-2 text-center text-foreground">
				{/* Candidate Name */}
				<div className="mx-auto w-fit">
					<InlineTextEditor
						className="rounded px-1.5 text-center font-semibold text-3xl hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactName", value)}
						placeholder="Tu Nombre"
						readOnly={readOnly}
						value={contactNameVal}
						variant="plain"
					/>
				</div>

				{/* Professional Title */}
				<div className="mx-auto w-fit">
					<InlineTextEditor
						className="rounded px-1.5 text-center font-medium text-muted-foreground text-xs uppercase tracking-widest hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactTitle", value)}
						placeholder="Título Profesional"
						readOnly={readOnly}
						value={contactTitleVal}
						variant="plain"
					/>
				</div>

				{/* Contact Details Row 1 */}
				<div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
					<div className="flex items-center gap-1.5">
						<EnvelopeSimpleIcon className="size-3.5 text-muted-foreground/80" />
						<InlineTextEditor
							className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("contactEmail", value)}
							placeholder="tu.email@example.com"
							readOnly={readOnly}
							value={contactEmailVal}
							variant="plain"
						/>
					</div>
					<span className="text-border">|</span>
					<div className="flex items-center gap-1.5">
						<PhoneIcon className="size-3.5 text-muted-foreground/80" />
						<InlineTextEditor
							className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("contactPhone", value)}
							placeholder="Teléfono"
							readOnly={readOnly}
							value={contactPhoneVal}
							variant="plain"
						/>
					</div>
					<span className="text-border">|</span>
					<div className="flex items-center gap-1.5">
						<MapPinIcon className="size-3.5 text-muted-foreground/80" />
						<InlineTextEditor
							className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("contactAddress", value)}
							placeholder="Ciudad, País"
							readOnly={readOnly}
							value={contactAddressVal}
							variant="plain"
						/>
					</div>
				</div>

				{/* Contact Details Row 2 */}
				<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
					<div className="flex items-center gap-1.5">
						<LinkedinLogoIcon className="size-3.5 text-muted-foreground/80" />
						<InlineTextEditor
							className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("contactLinkedin", value)}
							placeholder="linkedin.com/in/usuario"
							readOnly={readOnly}
							value={contactLinkedinVal}
							variant="plain"
						/>
					</div>
					{showWebsite && (
						<>
							<span className="text-border">|</span>
							<div className="flex items-center gap-1.5">
								<GlobeIcon className="size-3.5 text-muted-foreground/80" />
								<InlineTextEditor
									className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
									onBlur={commit}
									onChange={(value) => setField("contactWebsite", value)}
									placeholder="Sitio web o portafolio"
									readOnly={readOnly}
									value={contactWebsiteVal}
									variant="plain"
								/>
							</div>
						</>
					)}
				</div>

				{/* Border Line */}
				<div className="my-4 border-border border-b pb-3" />
			</div>

			<div className="flex flex-col gap-6 text-foreground">
				{/* Date Str (Right aligned) */}
				<div className="flex justify-end">
					<InlineTextEditor
						className="rounded px-1.5 text-right font-medium text-muted-foreground/80 text-xs hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("dateStr", value)}
						placeholder="Fecha"
						readOnly={readOnly}
						value={dateStrVal}
						variant="plain"
					/>
				</div>

				<RecipientBlock commit={commit} draft={draft} readOnly={readOnly} setField={setField} theme="centered" />

				{/* Saludo / Greeting */}
				<div className="mt-2">
					{showGreetingLoader ? (
						<Skeleton className="h-4 w-32 rounded-full" />
					) : (
						<InlineTextEditor
							className="rounded px-1 font-semibold text-foreground leading-snug hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("greeting", value)}
							placeholder="Saludo…"
							readOnly={readOnly}
							value={bodyToHtml(draft.greeting)}
							variant="prose"
						/>
					)}
				</div>

				{/* Cuerpo / Body */}
				<div className="mt-2">
					{showBodyLoader ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-3 w-full rounded-full" />
							<Skeleton className="h-3 w-11/12 rounded-full" />
							<Skeleton className="h-3 w-5/6 rounded-full" />
						</div>
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

				{/* Cierre / Closing */}
				<div className="mt-2">
					{showClosingLoader ? (
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

				{/* Firma / Signature */}
				<SignatureBlock
					commit={commit}
					draft={draft}
					preparing={preparing}
					readOnly={readOnly}
					setField={setField}
					theme="centered"
				/>
			</div>
		</>
	);
}

function ClassicTemplateView({
	userName,
	userEmail,
	userPhone,
	userLinkedin,
	todayDateStr,
	draft,
	setField,
	commit,
	readOnly = false,
	preparing = false,
}: TemplateProps) {
	return (
		<>
			<div className="mb-8 flex flex-col gap-1 text-left text-foreground">
				<div className="w-fit">
					<InlineTextEditor
						className="rounded px-1.5 font-semibold text-3xl hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactName", value)}
						placeholder="Tu Nombre"
						readOnly={readOnly}
						value={draft.contactName || userName}
						variant="plain"
					/>
				</div>
				{draft.contactTitle && (
					<div className="w-fit">
						<InlineTextEditor
							className="rounded px-1.5 font-medium text-muted-foreground text-xs hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("contactTitle", value)}
							placeholder="Título profesional"
							readOnly={readOnly}
							value={draft.contactTitle || ""}
							variant="plain"
						/>
					</div>
				)}
				<div className="mt-1 flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm">
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactEmail", value)}
						placeholder="Email"
						readOnly={readOnly}
						value={draft.contactEmail || userEmail}
						variant="plain"
					/>
					<span className="text-border">·</span>
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactPhone", value)}
						placeholder="Teléfono"
						readOnly={readOnly}
						value={draft.contactPhone || userPhone}
						variant="plain"
					/>
					<span className="text-border">·</span>
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactLinkedin", value)}
						placeholder="LinkedIn"
						readOnly={readOnly}
						value={draft.contactLinkedin || userLinkedin}
						variant="plain"
					/>
					{draft.contactAddress && (
						<>
							<span className="text-border">·</span>
							<InlineTextEditor
								className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
								onBlur={commit}
								onChange={(value) => setField("contactAddress", value)}
								placeholder="Dirección"
								readOnly={readOnly}
								value={draft.contactAddress || ""}
								variant="plain"
							/>
						</>
					)}
				</div>
				<div className="my-2 border-border border-b pb-3" />
			</div>

			<div className="flex flex-col gap-6 text-foreground">
				<div className="flex justify-end">
					<InlineTextEditor
						className="rounded px-1.5 text-right text-muted-foreground/80 text-xs hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("dateStr", value)}
						placeholder="Fecha"
						readOnly={readOnly}
						value={draft.dateStr || todayDateStr}
						variant="plain"
					/>
				</div>

				<RecipientBlock commit={commit} draft={draft} readOnly={readOnly} setField={setField} theme="classic" />

				<div className="mt-2">
					{readOnly && !draft.greeting && preparing ? (
						<Skeleton className="h-4 w-32 rounded-full" />
					) : (
						<InlineTextEditor
							className="rounded px-1 font-semibold text-foreground leading-snug hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("greeting", value)}
							placeholder="Saludo…"
							readOnly={readOnly}
							value={bodyToHtml(draft.greeting)}
							variant="prose"
						/>
					)}
				</div>

				<div className="mt-4">
					{readOnly && !draft.body && preparing ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-3 w-full rounded-full" />
							<Skeleton className="h-3 w-11/12 rounded-full" />
							<Skeleton className="h-3 w-5/6 rounded-full" />
						</div>
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

				<div className="mt-4">
					{readOnly && !draft.closing && preparing ? (
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
					theme="classic"
				/>
			</div>
		</>
	);
}

function MintyTemplateView({
	userName,
	userEmail,
	userPhone,
	userLinkedin,
	todayDateStr,
	draft,
	setField,
	commit,
	readOnly = false,
	preparing = false,
	userImage,
}: TemplateProps) {
	return (
		<>
			<div className="-mx-6 -mt-6 mb-8 flex items-center justify-between border-emerald-500/20 border-b bg-emerald-500/5 px-6 py-6 md:-mx-8 md:-mt-8 md:px-8">
				<div className="w-fit">
					<InlineTextEditor
						className="rounded px-1.5 font-semibold text-2xl text-emerald-800 hover:bg-emerald-500/10 focus:bg-emerald-500/10"
						onBlur={commit}
						onChange={(value) => setField("contactName", value)}
						placeholder="Tu Nombre"
						readOnly={readOnly}
						value={draft.contactName || userName}
						variant="plain"
					/>
				</div>
				<p className="font-medium text-emerald-600 text-xs uppercase tracking-wide">Carta de presentación</p>
			</div>

			<div className="grid grid-cols-4 gap-8 text-foreground">
				<aside className="col-span-1 flex flex-col gap-6 border-border border-r pr-4">
					<div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/5">
						{userImage ? (
							<img alt={userName} className="size-full object-cover" height={56} src={userImage} width={56} />
						) : (
							<span className="text-emerald-600 text-xl">👤</span>
						)}
					</div>
					<div className="flex flex-col gap-3">
						<h2 className="font-semibold text-emerald-700 text-xs uppercase tracking-wider">Contacto</h2>
						<div className="flex flex-col gap-2 break-all text-muted-foreground text-xs leading-relaxed">
							<div>
								<strong className="text-[10px] text-foreground uppercase">Email</strong>
								<InlineTextEditor
									className="rounded hover:bg-accent/40 focus:bg-accent/40"
									onBlur={commit}
									onChange={(value) => setField("contactEmail", value)}
									readOnly={readOnly}
									value={draft.contactEmail || userEmail}
									variant="plain"
								/>
							</div>
							<div>
								<strong className="text-[10px] text-foreground uppercase">Teléfono</strong>
								<InlineTextEditor
									className="rounded hover:bg-accent/40 focus:bg-accent/40"
									onBlur={commit}
									onChange={(value) => setField("contactPhone", value)}
									readOnly={readOnly}
									value={draft.contactPhone || userPhone}
									variant="plain"
								/>
							</div>
							<div>
								<strong className="text-[10px] text-foreground uppercase">LinkedIn</strong>
								<InlineTextEditor
									className="rounded hover:bg-accent/40 focus:bg-accent/40"
									onBlur={commit}
									onChange={(value) => setField("contactLinkedin", value)}
									readOnly={readOnly}
									value={draft.contactLinkedin || userLinkedin}
									variant="plain"
								/>
							</div>
							{draft.contactAddress && (
								<div>
									<strong className="text-[10px] text-foreground uppercase">Dirección</strong>
									<InlineTextEditor
										className="rounded hover:bg-accent/40 focus:bg-accent/40"
										onBlur={commit}
										onChange={(value) => setField("contactAddress", value)}
										readOnly={readOnly}
										value={draft.contactAddress || ""}
										variant="plain"
									/>
								</div>
							)}
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<h2 className="font-semibold text-emerald-700 text-xs uppercase tracking-wider">Fecha</h2>
						<InlineTextEditor
							className="rounded text-muted-foreground text-xs hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("dateStr", value)}
							readOnly={readOnly}
							value={draft.dateStr || todayDateStr}
							variant="plain"
						/>
					</div>
				</aside>

				<div className="col-span-3 flex flex-col gap-6">
					<RecipientBlock commit={commit} draft={draft} readOnly={readOnly} setField={setField} theme="minty" />

					<div className="mt-2">
						{readOnly && !draft.greeting && preparing ? (
							<Skeleton className="h-4 w-32 rounded-full" />
						) : (
							<InlineTextEditor
								className="rounded px-1 font-semibold text-foreground leading-snug hover:bg-accent/40 focus:bg-accent/40"
								onBlur={commit}
								onChange={(value) => setField("greeting", value)}
								placeholder="Saludo…"
								readOnly={readOnly}
								value={bodyToHtml(draft.greeting)}
								variant="prose"
							/>
						)}
					</div>

					<div className="mt-4">
						{readOnly && !draft.body && preparing ? (
							<div className="flex flex-col gap-2">
								<Skeleton className="h-3 w-full rounded-full" />
								<Skeleton className="h-3 w-11/12 rounded-full" />
								<Skeleton className="h-3 w-5/6 rounded-full" />
							</div>
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

					<div className="mt-4">
						{readOnly && !draft.closing && preparing ? (
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
						theme="minty"
					/>
				</div>
			</div>
		</>
	);
}

function BlueTemplateView({
	userName,
	userEmail,
	userPhone,
	userLinkedin,
	todayDateStr,
	draft,
	setField,
	commit,
	readOnly = false,
	preparing = false,
	userImage,
}: TemplateProps) {
	return (
		<>
			<div className="mb-8 flex flex-col items-center gap-3 border-blue-500/10 border-b pb-6 text-foreground">
				<div className="flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-blue-500/5">
					{userImage ? (
						<img alt={userName} className="size-full object-cover" height={56} src={userImage} width={56} />
					) : (
						<span className="text-blue-500 text-xl">👤</span>
					)}
				</div>
				<div className="w-fit">
					<InlineTextEditor
						className="rounded px-1.5 font-semibold text-2xl text-blue-600 hover:bg-blue-500/10 focus:bg-blue-500/10"
						onBlur={commit}
						onChange={(value) => setField("contactName", value)}
						placeholder="Tu Nombre"
						readOnly={readOnly}
						value={draft.contactName || userName}
						variant="plain"
					/>
				</div>
				<p className="text-muted-foreground text-xs uppercase tracking-widest">Carta de presentación</p>
				<div className="flex flex-wrap items-center justify-center gap-x-2 text-muted-foreground text-sm">
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactEmail", value)}
						readOnly={readOnly}
						value={draft.contactEmail || userEmail}
						variant="plain"
					/>
					<span className="text-border">|</span>
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactPhone", value)}
						readOnly={readOnly}
						value={draft.contactPhone || userPhone}
						variant="plain"
					/>
					<span className="text-border">|</span>
					<InlineTextEditor
						className="rounded px-1 hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("contactLinkedin", value)}
						readOnly={readOnly}
						value={draft.contactLinkedin || userLinkedin}
						variant="plain"
					/>
				</div>
			</div>

			<div className="flex flex-col gap-6 text-foreground">
				<div className="flex justify-end">
					<InlineTextEditor
						className="rounded px-1.5 text-right text-muted-foreground/80 text-xs hover:bg-accent/40 focus:bg-accent/40"
						onBlur={commit}
						onChange={(value) => setField("dateStr", value)}
						readOnly={readOnly}
						value={draft.dateStr || todayDateStr}
						variant="plain"
					/>
				</div>

				<RecipientBlock commit={commit} draft={draft} readOnly={readOnly} setField={setField} theme="blue" />

				<div className="mt-2">
					{readOnly && !draft.greeting && preparing ? (
						<Skeleton className="h-4 w-32 rounded-full" />
					) : (
						<InlineTextEditor
							className="rounded px-1 font-semibold text-foreground leading-snug hover:bg-accent/40 focus:bg-accent/40"
							onBlur={commit}
							onChange={(value) => setField("greeting", value)}
							placeholder="Saludo…"
							readOnly={readOnly}
							value={bodyToHtml(draft.greeting)}
							variant="prose"
						/>
					)}
				</div>

				<div className="mt-4">
					{readOnly && !draft.body && preparing ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-3 w-full rounded-full" />
							<Skeleton className="h-3 w-11/12 rounded-full" />
							<Skeleton className="h-3 w-5/6 rounded-full" />
						</div>
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

				<div className="mt-4">
					{readOnly && !draft.closing && preparing ? (
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
					theme="blue"
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
	userPhone,
	userLinkedin,
	userImage,
	todayDateStr,
	onDraftChange,
}: {
	activeMessageId: string;
	letter: CoverLetter;
	onSaveArtifact: (messageId: string, artifact: CoverLetter) => Promise<unknown>;
	template?: "centered" | "classic" | "minty" | "blue" | null;
	userName: string;
	userEmail: string;
	userPhone: string;
	userLinkedin: string;
	userImage?: string;
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
		userPhone,
		userLinkedin,
		userImage,
		todayDateStr,
		draft,
		setField,
		commit,
		readOnly: false,
	};

	if (!template) {
		return (
			<FramePanel className="flex flex-1 flex-col overflow-y-auto">
				<div className="mx-auto w-full max-w-2xl flex-1 flex-col gap-3">
					<p className="px-1 text-muted-foreground text-xs">
						Edita cualquier sección directamente; se guarda solo
						{saving ? <span className="text-foreground/70"> · Guardando…</span> : null}
					</p>
					{SECTION_DEFS.map((def) => (
						<LetterSectionShell
							icon={def.icon}
							isStreaming={false}
							key={def.key}
							label={def.label}
							primary={def.primary}
						>
							<InlineTextEditor
								onBlur={commit}
								onChange={(value) => setField(def.key, value)}
								placeholder={`${def.label}…`}
								value={bodyToHtml(draft[def.key])}
								variant="prose"
							/>
						</LetterSectionShell>
					))}
				</div>
			</FramePanel>
		);
	}

	return (
		<FramePanel className="flex flex-1 flex-col overflow-y-auto bg-muted/35 p-6">
			<div className="mx-auto w-full max-w-4xl">
				<p className="mb-4 px-1 text-muted-foreground text-xs">
					Edita cualquier texto directamente; se guarda solo
					{saving ? <span className="text-foreground/70"> · Guardando…</span> : null}
				</p>

				<article className="letter-paper-preview relative flex w-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow-md md:p-8">
					{template === "centered" && <CenteredTemplateView {...props} />}
					{template === "classic" && <ClassicTemplateView {...props} />}
					{template === "minty" && <MintyTemplateView {...props} />}
					{template === "blue" && <BlueTemplateView {...props} />}
				</article>
			</div>
		</FramePanel>
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
	onTriggerAsync: (input: { extraPrompt?: string; language?: CoverLetterLanguage }) => Promise<unknown>;
	run: LetterRunState;
}

/** Header buttons: copy / download PDF / regenerate. (Editing is inline, no button.) */
function ArtifactToolbar({ latestDraftRef, letter, onTriggerAsync, run }: ArtifactToolbarProps) {
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

	if (!hasContent) {
		return null;
	}
	return (
		<div className="flex items-center gap-1.5" data-tour-step-id="letter-toolbar">
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
							<ArrowsClockwiseIcon className={cn((run.isPending || run.isStreaming) && "animate-spin")} weight="bold" />
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
		</div>
	);
}

/** Read-only letter view: during CASEY streaming or for display without editing. */
function ReadOnlyLetter({
	artifact,
	isStreaming,
	preparing,
	showLoaders,
	template,
	userName,
	userEmail,
	userPhone,
	userLinkedin,
	userImage,
	todayDateStr,
}: {
	artifact: DeepPartial<CoverLetter> | undefined;
	isStreaming: boolean;
	/** Generating but no content yet: show a friendly message above the skeleton. */
	preparing: boolean;
	showLoaders: boolean;
	template?: "centered" | "classic" | "minty" | "blue" | null;
	userName: string;
	userEmail: string;
	userPhone: string;
	userLinkedin: string;
	userImage?: string;
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

	// Active section (the one CASEY is writing) = the last one with content. Only the active
	// one shows "redactando…"; pending ones show only the skeleton.
	const activeIndex = SECTION_DEFS.reduce((acc, def, i) => {
		const v = artifact?.[def.key];
		return typeof v === "string" && v.trim() ? i : acc;
	}, 0);

	const props: TemplateProps = {
		userName,
		userEmail,
		userPhone,
		userLinkedin,
		userImage,
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

	if (!template) {
		return (
			<FramePanel className="flex flex-1 flex-col overflow-y-auto">
				<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
					{preparing && (
						<p className="px-1 text-muted-foreground text-sm">
							<Shimmer>CASEY está leyendo tu CV y redactando tu carta…</Shimmer>
						</p>
					)}
					{SECTION_DEFS.map((def, i) => {
						const value = artifact?.[def.key];
						const text = typeof value === "string" ? value : undefined;
						return (
							<CoverLetterSection
								def={def}
								isStreaming={isStreaming && i === activeIndex}
								key={def.key}
								showSkeleton={showLoaders && !text}
								text={text}
							/>
						);
					})}
				</div>
			</FramePanel>
		);
	}

	return (
		<FramePanel className="flex flex-1 flex-col overflow-y-auto bg-muted/35 p-6">
			<div className="mx-auto w-full max-w-4xl">
				{preparing && (
					<p className="mb-4 px-1 text-muted-foreground text-sm">
						<Shimmer>CASEY está leyendo tu CV y redactando tu carta…</Shimmer>
					</p>
				)}

				<article className="letter-paper-preview relative flex w-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow-md md:p-8">
					{template === "centered" && <CenteredTemplateView {...props} />}
					{template === "classic" && <ClassicTemplateView {...props} />}
					{template === "minty" && <MintyTemplateView {...props} />}
					{template === "blue" && <BlueTemplateView {...props} />}
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
	run,
}: LettersArtifactPanelProps) {
	const latestDraftRef = useRef<CoverLetter | null>(null);
	const { data: session } = authClient.useSession();
	const userName = session?.user?.name || "Tu Nombre";
	const userEmail = session?.user?.email || "tu.email@example.com";
	const userPhone = "+51 999 999 999";
	const userLinkedin = "linkedin.com/in/candidato";
	const userImage = session?.user?.image ?? undefined;
	const todayDateStr = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date());

	const { activeMessageId, activeVersion, artifact, hasContent, maxVersions } = letter;
	const { error, isPending, isStreaming } = run;
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
				className="flex min-h-0 flex-1 flex-col"
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
					userImage={userImage}
					userLinkedin={userLinkedin}
					userName={userName}
					userPhone={userPhone}
				/>
			</motion.div>
		);
	} else if (hasStreamedContent || showLoaders) {
		body = (
			<motion.div
				animate={{ opacity: 1 }}
				className="flex min-h-0 flex-1 flex-col"
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				key="readonly"
				transition={panelTransition}
			>
				<ReadOnlyLetter
					artifact={artifact}
					isStreaming={isStreaming}
					preparing={preparing}
					showLoaders={showLoaders}
					template={letter.template}
					todayDateStr={todayDateStr}
					userEmail={userEmail}
					userImage={userImage}
					userLinkedin={userLinkedin}
					userName={userName}
					userPhone={userPhone}
				/>
			</motion.div>
		);
	}

	return (
		<Frame className={className ?? "h-full min-h-0"} data-tour-step-id="letter-artifact">
			<FrameHeader className="flex-row items-start justify-between gap-3">
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
				</div>

				<ArtifactToolbar latestDraftRef={latestDraftRef} letter={letter} onTriggerAsync={onTriggerAsync} run={run} />
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
