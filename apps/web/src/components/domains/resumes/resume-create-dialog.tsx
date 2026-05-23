import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
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

export const resumeCreateSearchSchema = z.object({
	create: z.literal(1).optional(),
	parserRunId: z.string().optional(),
});

const REALTIME_TOKEN_STALE_MS = 29 * 60 * 1000;

export function ResumeCreateDialog(): React.ReactElement {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const rawSearch = useSearch({ strict: false });
	const search = resumeCreateSearchSchema.parse(rawSearch);
	const open = search.create === 1;
	const parserRunId = search.parserRunId;

	const closeDialog = () => navigate({ to: ".", search: () => ({}) });
	const setParserRunId = (runId: string | undefined) =>
		navigate({ to: ".", search: () => ({ create: 1, parserRunId: runId }) });

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
				closeDialog();
				navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	const parseMutation = useMutation(
		orpc.agents.triggerK02ParseResume.mutationOptions({
			onSuccess: ({ runId }) => setParserRunId(runId),
			onError: (err) => toast.error(err.message),
		})
	);

	const handleComplete = (resumeId: string) => {
		queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() });
		setParserRunId(undefined);
		closeDialog();
		navigate({ to: "/dash/resumes/$resumeId", params: { resumeId } });
	};

	const handleTerminal = () => {
		setParserRunId(undefined);
	};

	const handleRetry = () => {
		setParserRunId(undefined);
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
		<Dialog onOpenChange={(next) => (next ? null : closeDialog())} open={open}>
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
