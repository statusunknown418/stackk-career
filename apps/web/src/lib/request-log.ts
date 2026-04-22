import type { RequestLogger } from "evlog";
import { useRequest as getNitroRequest } from "nitro/context";

interface RequestWithLog {
	context: {
		log?: RequestLogger;
	};
}

export const readRequestLog = (): RequestLogger | undefined => (getNitroRequest() as RequestWithLog).context.log;

export const getRequestLog = (): RequestLogger => {
	const log = readRequestLog();
	if (!log) {
		throw new Error("evlog request logger missing. Check Nitro evlog module setup.");
	}

	return log;
};
