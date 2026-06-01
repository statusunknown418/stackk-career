function errorMessageFromRecord(record: Record<string, unknown>): string {
	const message = record.message;
	const status = record.status;
	const code = record.code;

	if (typeof message === "string" && message.length > 0) {
		if (typeof status === "number" || typeof status === "string") {
			return `${message} (status ${status})`;
		}
		if (typeof code === "string" && code.length > 0) {
			return `${message} (${code})`;
		}
		return message;
	}

	try {
		return JSON.stringify(record) ?? String(record);
	} catch {
		return String(record);
	}
}

export const toError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error;
	}

	if (typeof error === "object" && error !== null) {
		const record = error as Record<string, unknown>;
		const normalized = new Error(errorMessageFromRecord(record), { cause: error });
		if (typeof record.name === "string" && record.name.length > 0) {
			normalized.name = record.name;
		}
		if (typeof record.stack === "string" && record.stack.length > 0) {
			normalized.stack = record.stack;
		}
		return normalized;
	}

	return new Error(String(error));
};
