import "@tanstack/react-start/server-only";

import type { RequestLogger } from "evlog";
import { useRequest } from "nitro/context";

interface AppRequestContext {
	log?: RequestLogger;
	requestId?: string;
}

interface RequestMeta {
	requestId?: string;
	waitUntil?: (promise: Promise<unknown>) => void | Promise<void>;
}

const readRequestContext = () => useRequest().context as AppRequestContext | undefined;

export const readRequestLog = () => readRequestContext()?.log;

export const readRequestMeta = (): RequestMeta => {
	const request = useRequest();
	const requestId = readRequestContext()?.requestId;

	return {
		requestId: typeof requestId === "string" ? requestId : undefined,
		waitUntil: request.waitUntil,
	};
};

export const getRequestLog = (): RequestLogger => {
	const log = readRequestLog();
	if (!log) {
		throw new Error("evlog request logger missing. Check Nitro evlog plugin setup.");
	}
	return log;
};
