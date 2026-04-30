import { createId } from "@paralleldrive/cuid2";
import type { RequestLogger } from "evlog";
import { createRequestLogger } from "evlog";

interface StartRequestLogOptions {
	method: string;
	path: string;
	request?: Request;
}

interface ForkRequestLogOptions {
	method: string;
	operation: string;
	parent?: RequestLogger;
	path: string;
}

const readNonEmptyString = (value: unknown): string | undefined =>
	typeof value === "string" && value.length > 0 ? value : undefined;

export const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/**
 * Start a new request log at an entry point (HTTP handler, webhook, route).
 *
 * Use when no parent log exists. Reuses incoming `x-request-id` header if present.
 * Pair with {@link withRequestLog} for auto-emit, or call `.emit()` manually.
 */
export const startRequestLog = ({ request, method, path }: StartRequestLogOptions): RequestLogger =>
	createRequestLogger({
		method,
		path,
		requestId: readNonEmptyString(request?.headers.get("x-request-id")) ?? crypto.randomUUID(),
	});

/**
 * Fork a child log from an existing parent log for a sub-operation (background job, stream, nested call).
 *
 * Use when a parent log already exists and you want correlation via `_parentRequestId`.
 * Inherits `method`/`path` from parent if available; falls back to provided values.
 * Pair with {@link createManualEmitter} for streams or async callbacks where lifetime
 * exceeds the calling function.
 */
export const forkRequestLog = ({ parent, method, operation, path }: ForkRequestLogOptions): RequestLogger => {
	const parentContext = parent?.getContext();
	const parentRequestId = readNonEmptyString(parentContext?.requestId);

	const log = createRequestLogger({
		method: readNonEmptyString(parentContext?.method) ?? method,
		path: readNonEmptyString(parentContext?.path) ?? path,
		requestId: `req_${createId()}`,
	});

	log.set({
		operation,
		...(parentRequestId ? { _parentRequestId: parentRequestId } : {}),
	});

	return log;
};

/**
 * Create a one-shot emitter for logs whose lifetime spans multiple async callbacks.
 *
 * Use for streams or event-driven flows where emit timing is not tied to a single function
 * (e.g. `onFinish`, `onError`, `onAbort` may all fire — only the first wins).
 * For sync-ish handlers, prefer {@link withRequestLog} instead.
 */
export const createManualEmitter = (log: RequestLogger): ((context?: Record<string, unknown>) => void) => {
	let hasEmitted = false;

	return (context) => {
		if (hasEmitted) {
			return;
		}

		if (context) {
			log.set(context);
		}

		log.emit();
		hasEmitted = true;
	};
};

/**
 * Run a function with auto error capture and guaranteed emit on exit.
 *
 * Use for handlers where the log lifetime matches the function call. Errors are logged
 * and re-thrown. Always emits in `finally`. For streams / multi-callback flows, use
 * {@link createManualEmitter} instead.
 */
export const withRequestLog = async <T>(log: RequestLogger, run: () => Promise<T> | T): Promise<T> => {
	try {
		return await run();
	} catch (error) {
		log.error(toError(error));
		throw error;
	} finally {
		log.emit();
	}
};
