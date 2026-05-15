import { getEnvironment } from "evlog";
import type { H3Event } from "h3";
import { createError, defineEventHandler, getHeader, getRequestHost, readBody, setResponseStatus } from "h3";
import { drain } from "../../../plugins/evlog-drain";

const VALID_LEVELS = ["info", "error", "warn", "debug"] as const;
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const validateOrigin = (event: H3Event): void => {
	const origin = getHeader(event, "origin");
	const referer = getHeader(event, "referer");
	const host = getRequestHost(event);
	const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);

	if (!requestOrigin) {
		throw createError({
			statusCode: 403,
			message: "Missing origin header",
		});
	}

	if (new URL(requestOrigin).host !== host) {
		throw createError({
			statusCode: 403,
			message: "Invalid origin",
		});
	}
};

const isValidISOTimestamp = (value: string): boolean => {
	if (!ISO_8601_REGEX.test(value)) {
		return false;
	}

	const date = new Date(value);
	return !Number.isNaN(date.getTime());
};

const validatePayload = (
	body: unknown
): Record<string, unknown> & { level: (typeof VALID_LEVELS)[number]; timestamp: string } => {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw createError({
			statusCode: 400,
			message: "Invalid request body",
		});
	}

	const payload = body as Record<string, unknown>;
	const rawTimestamp = payload.timestamp;

	if (rawTimestamp === undefined || rawTimestamp === null) {
		throw createError({
			statusCode: 400,
			message: "Missing required field: timestamp",
		});
	}

	let timestamp: string;
	if (typeof rawTimestamp === "number") {
		const minTimestamp = new Date("2000-01-01").getTime();
		const maxTimestamp = Date.now() + 24 * 60 * 60 * 1000;

		if (rawTimestamp < minTimestamp || rawTimestamp > maxTimestamp) {
			throw createError({
				statusCode: 400,
				message: "Invalid timestamp: value out of reasonable range",
			});
		}

		timestamp = new Date(rawTimestamp).toISOString();
	} else if (typeof rawTimestamp === "string") {
		if (!isValidISOTimestamp(rawTimestamp)) {
			throw createError({
				statusCode: 400,
				message: "Invalid timestamp: must be a valid ISO 8601 datetime string",
			});
		}

		timestamp = rawTimestamp;
	} else {
		throw createError({
			statusCode: 400,
			message: "Invalid timestamp: must be string or number",
		});
	}

	if (typeof payload.level !== "string" || !VALID_LEVELS.includes(payload.level as (typeof VALID_LEVELS)[number])) {
		throw createError({
			statusCode: 400,
			message: `Invalid level: must be one of ${VALID_LEVELS.join(", ")}`,
		});
	}

	return {
		...payload,
		level: payload.level as (typeof VALID_LEVELS)[number],
		timestamp,
	};
};

export default defineEventHandler(async (event) => {
	validateOrigin(event);

	const payload = validatePayload(await readBody(event));
	const { service: _clientService, ...sanitizedPayload } = payload;
	const wideEvent = {
		...sanitizedPayload,
		...getEnvironment(),
		source: "client",
	};

	await drain({
		event: wideEvent,
		request: {
			method: "POST",
			path: event.path,
		},
	});

	setResponseStatus(event, 204);
	return null;
});
