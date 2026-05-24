import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/utils/orpc";
import { ResumeCreateForm } from "./resume-create-form";
import { ResumeImportProgress } from "./resume-import-progress";

const REALTIME_TOKEN_STALE_MS = 29 * 60 * 1000;

interface ResumeCreateDialogProps {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

interface ResumeCreateFlowProps {
	onClose: () => void;
	open: boolean;
}

function ResumeCreateFlow({ onClose, open }: ResumeCreateFlowProps): React.ReactElement {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [parserRunId, setParserRunId] = useState<string | undefined>(undefined);

	const tokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: open,
		staleTime: REALTIME_TOKEN_STALE_MS,
	});
	const accessToken = tokenQuery.data?.token;

	const handleComplete = (resumeId: string) => {
		queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
		setParserRunId(undefined);
		onClose();
		navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
	};

	const handleTerminal = () => setParserRunId(undefined);
	const handleRetry = () => setParserRunId(undefined);
	let body: React.ReactNode;

	if (!parserRunId) {
		body = (
			<ResumeCreateForm
				onClose={() => {
					setParserRunId(undefined);
					onClose();
				}}
				onParseStart={setParserRunId}
			/>
		);
	} else if (accessToken) {
		body = (
			<ResumeImportProgress
				accessToken={accessToken}
				onComplete={handleComplete}
				onRetry={handleRetry}
				onTerminal={handleTerminal}
				parserRunId={parserRunId}
			/>
		);
	} else {
		body = <Shimmer>Conectando con el agente…</Shimmer>;
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{parserRunId ? "Importando CV" : "Nuevo CV"}</DialogTitle>
				<DialogDescription>
					{parserRunId
						? "Estamos analizando tu PDF. Puedes cerrar este diálogo — seguirá en segundo plano."
						: "Dale un nombre y, opcionalmente, sube un PDF para extraer las secciones con IA."}
				</DialogDescription>
			</DialogHeader>

			<DialogPanel>{body}</DialogPanel>
		</>
	);
}

export function ResumeCreateDialog({ onOpenChange, open }: ResumeCreateDialogProps): React.ReactElement {
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onOpenChange(false);
				}
			}}
			open={open}
		>
			<DialogPopup>
				<ResumeCreateFlow onClose={() => onOpenChange(false)} open={open} />
				<DialogClose className="sr-only">Cerrar</DialogClose>
			</DialogPopup>
		</Dialog>
	);
}
