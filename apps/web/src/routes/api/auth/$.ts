import { auth } from "@stackk-career/auth";
import { createFileRoute } from "@tanstack/react-router";
import { getRequestLog } from "@/lib/request-log";

const handleAuth = ({ request }: { request: Request }) => {
	const log = getRequestLog();
	log.set({
		auth: {
			handler: "better-auth",
			method: request.method,
		},
	});

	return auth.handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handleAuth,
			POST: handleAuth,
		},
	},
});
