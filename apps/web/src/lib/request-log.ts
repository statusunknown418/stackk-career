import "@tanstack/react-start/server-only";

import type { RequestLogger } from "evlog";
import { useRequest } from "nitro/context";

export const readRequestLog = (): RequestLogger | undefined => {
	const req = useRequest() as { context?: { log?: RequestLogger } } | undefined;
	return req?.context?.log;
};

export const getRequestLog = (): RequestLogger => {
	const log = readRequestLog();
	if (!log) {
		throw new Error("evlog request logger missing. Check Nitro evlog plugin setup.");
	}
	return log;
};
