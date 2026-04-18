import { auth } from "@stackk-career/auth";
import type { RequestLogger } from "evlog";

interface CreateContextOptions {
	log?: RequestLogger;
	req: Request;
}

export async function createContext({ log, req }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: req.headers,
	});

	log?.set({
		auth: {
			authenticated: Boolean(session?.user),
			provider: "better-auth",
		},
	});

	if (session?.user?.id) {
		log?.set({
			user: {
				id: session.user.id,
			},
		});
	}

	return {
		auth: null,
		log,
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
