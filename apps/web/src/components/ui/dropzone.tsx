"use client";

import { UploadIcon } from "@phosphor-icons/react";
import { useDropzone } from "@uploadthing/react";
import { CloudUploadIcon, FileIcon, XIcon } from "lucide-react";
import * as React from "react";
import {
	allowedContentTextLabelGenerator,
	generateClientDropzoneAccept,
	generatePermittedFileTypes,
} from "uploadthing/client";
import type { ClientUploadedFileData } from "uploadthing/types";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UploadRouter } from "@/files/uploadthing";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

type DropzoneEndpoint = keyof UploadRouter;

export interface DropzoneProps<T> extends Omit<React.ComponentProps<"div">, "onChange" | "onDrop"> {
	autoUpload?: boolean;
	disabled?: boolean;
	endpoint: DropzoneEndpoint;
	input: T;
	onChange?: (files: File[]) => void;
	onClientUploadComplete?: (files: ClientUploadedFileData<{ storedId?: string }>[]) => void;
	onDragReject?: () => void;
	onUploadError?: (error: Error) => void;
	uploadButtonLabel?: string;
}

export function Dropzone<T extends Record<string, unknown>>({
	autoUpload,
	endpoint,
	onClientUploadComplete,
	onDragReject,
	onUploadError,
	onChange,
	disabled,
	className,
	input,
	uploadButtonLabel,
	...props
}: DropzoneProps<T>): React.ReactElement {
	const [files, setFiles] = React.useState<File[]>([]);
	const [progress, setProgress] = React.useState<number>(0);

	const { startUpload, isUploading, routeConfig } = useUploadThing(endpoint, {
		onClientUploadComplete: (res) => {
			setFiles([]);
			setProgress(0);
			onClientUploadComplete?.(res);
		},
		onUploadError: (err) => onUploadError?.(err),
		onUploadProgress: setProgress,
	});

	const { fileTypes, multiple } = generatePermittedFileTypes(routeConfig);
	const allowedLabel = allowedContentTextLabelGenerator(routeConfig);
	const isDisabled = disabled || isUploading;

	const handleDrop = React.useCallback(
		(accepted: File[]) => {
			setFiles(accepted);
			onChange?.(accepted);
			if (autoUpload && accepted.length > 0) {
				startUpload(accepted, input);
			}
		},
		[autoUpload, input, onChange, startUpload]
	);

	const handleRemove = React.useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		onDrop: handleDrop,
		accept: fileTypes.length > 0 ? generateClientDropzoneAccept(fileTypes) : undefined,
		multiple,
		disabled: isDisabled,
	});
	const wasDragRejectRef = React.useRef(false);

	React.useEffect(() => {
		if (isDragReject && !wasDragRejectRef.current) {
			onDragReject?.();
		}
		wasDragRejectRef.current = isDragReject;
	}, [isDragReject, onDragReject]);
	let dragMessage = autoUpload
		? "Arrastra y suelta o haz clic para subir"
		: "Arrastra y suelta o haz clic para seleccionar";

	if (isDragActive) {
		dragMessage = "Suelta los archivos aquí";
	}

	if (isDragReject) {
		dragMessage = "Archivo no permitido";
	}

	const rootProps = getRootProps() as React.ComponentProps<"div">;
	const inputProps = getInputProps() as React.ComponentProps<"input">;

	return (
		<div
			className={cn(
				"relative flex flex-col items-center justify-center gap-4 rounded-xl border border-input border-dashed bg-muted/40 p-6 text-center outline-none transition-colors",
				"hover:border-ring/64 hover:bg-muted",
				"data-[drag-active=true]:border-ring data-[drag-active=true]:bg-accent",
				"data-[drag-reject=true]:border-destructive/60 data-[drag-reject=true]:bg-destructive/5",
				isDisabled && "pointer-events-none opacity-64",
				className
			)}
			data-drag-active={isDragActive}
			data-drag-reject={isDragReject}
			data-slot="dropzone"
			{...props}
			{...rootProps}
		>
			<input {...inputProps} />

			<div className="flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs">
				<CloudUploadIcon className="size-5" />
			</div>

			<div className="flex flex-col gap-1">
				<p className="font-medium text-foreground text-sm">{dragMessage}</p>
				{allowedLabel && (
					<p className={cn("text-muted-foreground text-xs", isDragReject && "text-destructive")}>{allowedLabel}</p>
				)}
			</div>

			{files.length > 0 && (
				<ul className="flex w-full flex-col gap-2 text-left">
					{files.map((file, index) => (
						<li
							className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
							key={`${file.name}-${file.size}-${file.lastModified}`}
						>
							<FileIcon className="size-4 shrink-0 text-muted-foreground" />
							<span className="flex-1 truncate">{file.name}</span>
							{!isUploading && (
								<Button
									aria-label={`Eliminar ${file.name}`}
									onClick={(e) => {
										e.stopPropagation();
										handleRemove(index);
									}}
									size="icon-xs"
									type="button"
									variant="ghost"
								>
									<XIcon />
								</Button>
							)}
						</li>
					))}
				</ul>
			)}

			{isUploading && <Progress className="w-full" value={progress} />}

			{!autoUpload && files.length > 0 && !isUploading && (
				<Button
					className="tabular-nums"
					loading={isUploading}
					onClick={(e) => {
						e.stopPropagation();
						startUpload(files, input);
					}}
					size="sm"
					type="button"
				>
					<UploadIcon />
					{uploadButtonLabel ?? `Subir archivo${files.length > 1 ? "s" : ""}`}
				</Button>
			)}
		</div>
	);
}
