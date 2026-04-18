import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

const rpcMiddleware = o.middleware(({ context, next, path }) => {
	context.log?.set({
		rpc: {
			authenticated: Boolean(context.session?.user),
			path: path ?? "unknown",
		},
	});

	return next();
});

export const publicProcedure = o.use(rpcMiddleware);

const requireAuth = o.middleware(({ context, next }) => {
	if (!context.session?.user) {
		context.log?.set({
			auth: {
				authenticated: false,
				required: true,
			},
		});
		throw new ORPCError("UNAUTHORIZED");
	}

	context.log?.set({
		auth: {
			authenticated: true,
			required: true,
		},
		user: {
			id: context.session.user.id,
		},
	});

	return next({
		context: {
			log: context.log,
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);
