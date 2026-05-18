import "@tanstack/react-start/server-only";

import type { RequestLogger } from "evlog";

interface RequestLogGlobal {
	__readRequestLog?: () => RequestLogger | undefined;
}

export const readRequestLog = (): RequestLogger | undefined => (globalThis as RequestLogGlobal).__readRequestLog?.();

export const getRequestLog = (): RequestLogger => {
	const log = readRequestLog();
	if (!log) {
		throw new Error("evlog request logger missing. Check Nitro evlog module setup.");
	}

	return log;
};
