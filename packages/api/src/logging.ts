import type { RequestLogger } from "evlog";
import { createRequestLogger } from "evlog";

interface CreateStandaloneRequestLogOptions {
	method: string;
	path: string;
	request?: Request;
}

interface CreateCorrelatedRequestLogOptions {
	method: string;
	operation: string;
	parent?: RequestLogger;
	path: string;
}

const readNonEmptyString = (value: unknown): string | undefined =>
	typeof value === "string" && value.length > 0 ? value : undefined;

export const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

export const createStandaloneRequestLog = ({
	request,
	method,
	path,
}: CreateStandaloneRequestLogOptions): RequestLogger =>
	createRequestLogger({
		method,
		path,
		requestId: readNonEmptyString(request?.headers.get("x-request-id")) ?? crypto.randomUUID(),
	});

export const createCorrelatedRequestLog = ({
	parent,
	method,
	operation,
	path,
}: CreateCorrelatedRequestLogOptions): RequestLogger => {
	const parentContext = parent?.getContext();
	const parentRequestId = readNonEmptyString(parentContext?.requestId);

	const log = createRequestLogger({
		method: readNonEmptyString(parentContext?.method) ?? method,
		path: readNonEmptyString(parentContext?.path) ?? path,
		requestId: crypto.randomUUID(),
	});

	log.set({
		operation,
		...(parentRequestId ? { _parentRequestId: parentRequestId } : {}),
	});

	return log;
};

export const createRequestLogEmitter = (log: RequestLogger): ((context?: Record<string, unknown>) => void) => {
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

export const runWithRequestLog = async <T>(log: RequestLogger, run: () => Promise<T> | T): Promise<T> => {
	try {
		return await run();
	} catch (error) {
		log.error(toError(error));
		throw error;
	} finally {
		log.emit();
	}
};
