import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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

interface ResumeCreateDialogProps {
	onClose: () => void;
	onParserRunChange: (runId: string | undefined) => void;
	open: boolean;
	parserRunId: string | undefined;
}

const REALTIME_TOKEN_STALE_MS = 29 * 60 * 1000;

export function ResumeCreateDialog({
	onClose,
	onParserRunChange,
	open,
	parserRunId,
}: ResumeCreateDialogProps): React.ReactElement {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const tokenQuery = useQuery({
		...orpc.viewer.realtimeToken.queryOptions(),
		enabled: open,
		staleTime: REALTIME_TOKEN_STALE_MS,
	});
	const accessToken = tokenQuery.data?.token;

	const createBlankMutation = useMutation(
		orpc.resumes.create.mutationOptions({
			onSuccess: ({ resumeId }) => {
				queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
				onClose();
				navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const parseMutation = useMutation(
		orpc.agents.triggerK02ParseResume.mutationOptions({
			onSuccess: ({ runId }) => onParserRunChange(runId),
			onError: (err) => toast.error(err.message),
		})
	);

	const handleComplete = (resumeId: string) => {
		queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
		onParserRunChange(undefined);
		onClose();
		navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
	};

	const handleTerminal = () => {
		onParserRunChange(undefined);
	};

	const handleRetry = () => {
		onParserRunChange(undefined);
	};

	const isMutating = createBlankMutation.isPending || parseMutation.isPending;

	const renderBody = () => {
		if (!parserRunId) {
			return (
				<ResumeCreateForm
					disabled={isMutating}
					onCreateBlank={({ label }) => createBlankMutation.mutate({ label })}
					onParse={({ fileId, label }) => parseMutation.mutate({ fileId, displayName: label })}
				/>
			);
		}
		if (!accessToken) {
			return <p className="text-muted-foreground text-sm">Conectando con el agente…</p>;
		}
		return (
			<ResumeImportProgress
				accessToken={accessToken}
				onComplete={handleComplete}
				onRetry={handleRetry}
				onTerminal={handleTerminal}
				parserRunId={parserRunId}
			/>
		);
	};

	return (
		<Dialog onOpenChange={(next) => (next ? null : onClose())} open={open}>
			<DialogPopup>
				<DialogHeader>
					<DialogTitle>{parserRunId ? "Importando CV" : "Nuevo CV"}</DialogTitle>
					<DialogDescription>
						{parserRunId
							? "Estamos analizando tu PDF. Puedes cerrar este diálogo — seguirá en segundo plano."
							: "Dale un nombre y, opcionalmente, sube un PDF para extraer las secciones con IA."}
					</DialogDescription>
				</DialogHeader>

				<DialogPanel>{renderBody()}</DialogPanel>

				<DialogClose className="sr-only">Cerrar</DialogClose>
			</DialogPopup>
		</Dialog>
	);
}
