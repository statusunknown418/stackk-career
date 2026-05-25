import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

const MAX_CAUSE_DEPTH = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function describeError(value: unknown): Record<string, unknown> {
	if (!isRecord(value)) {
		return { value: String(value) };
	}
	return {
		name: typeof value.name === "string" ? value.name : undefined,
		message: typeof value.message === "string" ? value.message : undefined,
		code: typeof value.code === "string" || typeof value.code === "number" ? value.code : undefined,
		rawCode: typeof value.rawCode === "number" ? value.rawCode : undefined,
		proto: typeof value.proto === "string" ? value.proto : undefined,
		status: typeof value.status === "number" ? value.status : undefined,
	};
}

function describeCauseChain(err: unknown, depth = 0, seen: Set<unknown> = new Set()): Record<string, unknown>[] {
	if (!err || depth >= MAX_CAUSE_DEPTH || seen.has(err)) {
		return [];
	}
	seen.add(err);
	const cause = isRecord(err) ? err.cause : undefined;
	return [describeError(err), ...describeCauseChain(cause, depth + 1, seen)];
}

const observabilityMiddleware = o.middleware(async ({ context, next, path }) => {
	const start = performance.now();
	context.log?.set({
		rpc: {
			authenticated: Boolean(context.session?.user),
			path: path ?? "unknown",
		},
	});

	try {
		const result = await next();
		context.log?.set({ duration_ms: performance.now() - start });
		return result;
	} catch (err) {
		const duration_ms = performance.now() - start;
		const chain = describeCauseChain(err);
		const isClientError = err instanceof ORPCError && err.status < 500;

		context.log?.set({
			duration_ms,
			error: {
				chain,
				kind: err instanceof ORPCError ? "orpc" : "unhandled",
				client: isClientError,
			},
		});

		if (!isClientError) {
			context.log?.error(err instanceof Error ? err : new Error(String(err)));
		}

		throw err;
	}
});

export const publicProcedure = o.use(observabilityMiddleware);

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
