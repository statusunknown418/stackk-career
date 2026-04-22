import { auth } from "@stackk-career/auth";
import { db } from "@stackk-career/db";

interface CreateContextOptions {
	req: Request;
}

export async function createContext({ req }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: req.headers,
	});

	return {
		auth: null,
		session,
		db,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
