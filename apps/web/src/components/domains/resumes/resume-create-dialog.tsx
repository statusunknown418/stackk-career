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
import { invalidateBillingQueries } from "@/lib/billing-cache";
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
	const [parserHasTargetJobUrl, setParserHasTargetJobUrl] = useState(false);

	const tokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: open,
		staleTime: REALTIME_TOKEN_STALE_MS,
	});
	const accessToken = tokenQuery.data?.token;

	const handleComplete = (resumeId: string) => {
		Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() }),
			invalidateBillingQueries(queryClient),
		]);
		setParserRunId(undefined);
		setParserHasTargetJobUrl(false);
		onClose();
		navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
	};

	const clearParserRun = () => {
		setParserRunId(undefined);
		setParserHasTargetJobUrl(false);
	};
	const handleParseStart = (runId: string, hasTargetJobUrl: boolean) => {
		setParserHasTargetJobUrl(hasTargetJobUrl);
		setParserRunId(runId);
	};
	const handleTerminal = clearParserRun;
	const handleRetry = clearParserRun;
	let body: React.ReactNode;

	if (!parserRunId) {
		body = (
			<ResumeCreateForm
				onClose={() => {
					clearParserRun();
					onClose();
				}}
				onParseStart={handleParseStart}
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

	let dialogTitle = "Crear o mejorar tu CV";
	let dialogDescription =
		"Usa LinkedIn como contexto, tu PDF como punto de partida o ambos. Si adjuntas un PDF, el análisis empieza cuando pulses continuar.";

	if (parserRunId) {
		dialogTitle = "Importando tu CV";
		dialogDescription = parserHasTargetJobUrl
			? "Estamos importando tu PDF y sincronizando la oferta de LinkedIn para personalizar las sugerencias. Puedes cerrar este panel; seguirá en segundo plano."
			: "Estamos importando tu PDF. Puedes cerrar este panel; seguirá en segundo plano.";
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{dialogTitle}</DialogTitle>
				<DialogDescription>{dialogDescription}</DialogDescription>
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
