import { createFileRoute } from "@tanstack/react-router";
import { createError, getEnvironment } from "evlog";
import { z } from "zod";
import { drain } from "../../../../server/utils/axiom-drain";

const VALID_LEVELS = ["info", "error", "warn", "debug"] as const;
const MIN_TIMESTAMP = new Date("2000-01-01").getTime();
const MAX_TIMESTAMP_SKEW_MS = 24 * 60 * 60 * 1000;

const numericTimestampSchema = z
	.number()
	.refine((value) => {
		const maxTimestamp = Date.now() + MAX_TIMESTAMP_SKEW_MS;
		return value >= MIN_TIMESTAMP && value <= maxTimestamp;
	}, "Invalid timestamp: value out of reasonable range")
	.transform((value) => new Date(value).toISOString());

const isoTimestampSchema = z.iso
	.datetime()
	.refine(
		(value) => !Number.isNaN(new Date(value).getTime()),
		"Invalid timestamp: must be a valid ISO 8601 datetime string"
	);

const timestampSchema = z.union([numericTimestampSchema, isoTimestampSchema]);

const payloadSchema = z.looseObject({
	timestamp: timestampSchema,
	level: z.enum(VALID_LEVELS),
});

type ClientWideEvent = z.infer<typeof payloadSchema>;

const validateOrigin = (request: Request): void => {
	const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
	if (!requestOrigin) {
		throw createError({
			status: 403,
			message: "Missing origin header",
		});
	}

	let originUrl: URL;
	try {
		originUrl = new URL(requestOrigin);
	} catch {
		throw createError({
			status: 400,
			message: "Invalid origin header",
		});
	}

	let requestUrl: URL;
	try {
		requestUrl = new URL(request.url);
	} catch {
		throw createError({
			status: 400,
			message: "Invalid request URL",
		});
	}

	if (originUrl.host !== requestUrl.host) {
		throw createError({
			status: 403,
			message: "Invalid origin",
		});
	}
};

const validatePayload = (body: unknown): ClientWideEvent => {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw createError({
			status: 400,
			message: "Invalid request body",
		});
	}

	const result = payloadSchema.safeParse(body);
	if (!result.success) {
		throw createError({
			status: 400,
			message: result.error.issues[0]?.message ?? "Invalid request body",
		});
	}

	return result.data;
};

const handleIngest = async ({ request }: { request: Request }) => {
	validateOrigin(request);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw createError({
			status: 400,
			message: "Invalid JSON body",
		});
	}

	const payload = validatePayload(body);
	const {
		service: _clientService,
		environment: _clientEnvironment,
		version: _clientVersion,
		commitHash: _clientCommitHash,
		region: _clientRegion,
		source: _clientSource,
		...sanitizedPayload
	} = payload;

	let pathname: string;
	try {
		pathname = new URL(request.url).pathname;
	} catch {
		throw createError({
			status: 400,
			message: "Invalid request URL",
		});
	}

	await drain({
		event: {
			...sanitizedPayload,
			...getEnvironment(),
			source: "client",
		},
		request: {
			method: request.method,
			path: pathname,
		},
	});

	return new Response(null, { status: 204 });
};

export const Route = createFileRoute("/api/_evlog/ingest")({
	server: {
		handlers: {
			POST: handleIngest,
		},
	},
});
