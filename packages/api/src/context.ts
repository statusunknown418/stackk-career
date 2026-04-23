import { auth } from "@stackk-career/auth";
import { db } from "@stackk-career/db";
import type { RequestLogger } from "evlog";

interface CreateContextOptions {
	log?: RequestLogger;
	req: Request;
}

export async function createContext({ req, log }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: req.headers,
	});

	return {
		auth: null,
		session,
		db,
		log,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
