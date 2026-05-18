import type { RequestLogger } from "evlog";
import { definePlugin } from "nitro";
import { useRequest } from "nitro/context";
import { drain } from "../utils/axiom-drain";

interface RequestLogGlobal {
	__readRequestLog?: () => RequestLogger | undefined;
}

export default definePlugin((nitroApp) => {
	nitroApp.hooks.hook("evlog:drain", drain);
	(globalThis as RequestLogGlobal).__readRequestLog = () => {
		const req = useRequest() as { context?: { log?: RequestLogger } } | undefined;
		return req?.context?.log;
	};
});
