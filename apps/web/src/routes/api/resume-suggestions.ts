import { createContext } from "@stackk-career/api/context";
import { createResumeSuggestionsStream } from "@stackk-career/api/lib/resume-suggestions";
import { suggestResumeBlockInputSchema } from "@stackk-career/schemas/api/suggestions";
import { createFileRoute } from "@tanstack/react-router";
import { readRequestLog } from "@/lib/request-log";

const handlePost = async ({ request }: { request: Request }) => {
	const context = await createContext({ req: request, log: readRequestLog() });

	if (!context.session?.user) {
		return new Response("Unauthorized", { status: 401 });
	}

	const json = await request.json().catch(() => null);
	const parsedInput = suggestResumeBlockInputSchema.safeParse(json);

	if (!parsedInput.success) {
		return new Response("Invalid input", { status: 400 });
	}

	const result = await createResumeSuggestionsStream({
		context,
		input: parsedInput.data,
		requestSignal: request.signal,
		streamPath: "api/resume-suggestions",
	});

	return result.toTextStreamResponse();
};

export const Route = createFileRoute("/api/resume-suggestions")({
	server: {
		handlers: {
			POST: handlePost,
		},
	},
});
