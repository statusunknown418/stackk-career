import { FileMdIcon } from "@phosphor-icons/react";
import { usePostHog } from "@posthog/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";

/**
 * Top-bar cover-letter action for the resume editor. When the CV already has a
 * cover letter, links straight to it (no duplicate); otherwise creates one from
 * the resume's READY job target — the only source available from the editor — and
 * opens the letter workspace. Renders nothing while undecided or when neither a
 * letter nor a ready target exists, so the action surfaces only when actionable.
 */
export function ResumeCoverLetterButton({ resumeId }: { resumeId: string }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const posthog = usePostHog();

	const lettersQuery = useQuery(orpc.letters.list.queryOptions());
	const jobTargetQuery = useQuery(orpc.resumes.getJobTarget.queryOptions({ input: { resumeId } }));

	// List is ordered by `updatedAt` desc, so the first match is the most recent
	// letter derived from this CV. Reuse it rather than spawning a duplicate.
	const existingLetter = lettersQuery.data?.find((letter) => letter.resumeId === resumeId) ?? null;

	const createMutation = useMutation(
		orpc.letters.createGeneration.mutationOptions({
			onSuccess: ({ generationId }) => {
				queryClient.invalidateQueries({ queryKey: orpc.letters.list.queryKey() });
				posthog?.capture("cover_letter_created", { generationId, source: "resume-job-target" });
				navigate({ params: { generationId }, to: "/dash/letters/$generationId" });
			},
			onError: (err) => toast.error(err.message),
		})
	);

	if (existingLetter) {
		return (
			<Button
				render={<Link params={{ generationId: existingLetter.id }} to="/dash/letters/$generationId" />}
				size="sm"
				variant="outline"
			>
				<FileMdIcon />
				Ver cover letter
			</Button>
		);
	}

	// Gate creation on a settled list (avoids a "Crear" → "Ver" flicker) and a
	// READY target (the create handler rejects anything else).
	if (lettersQuery.isPending || jobTargetQuery.data?.status !== "ready") {
		return null;
	}

	return (
		<Button
			disabled={createMutation.isPending}
			onClick={() => createMutation.mutate({ language: "es", resumeId, source: "resume-job-target", template: null })}
			size="sm"
			type="button"
			variant="outline"
		>
			{createMutation.isPending ? <Loader /> : <FileMdIcon />}
			Crear cover letter
		</Button>
	);
}
