import type { Cache } from "drizzle-orm/cache/core";
import { type UpstashCache, upstashCache } from "drizzle-orm/cache/upstash";

type UpstashOpts = Parameters<typeof upstashCache>[0];

function materializeRow(row: unknown): unknown {
	if (row === null || row === undefined || typeof row !== "object") {
		return row;
	}
	if (Array.isArray(row)) {
		return row;
	}
	const arrayLike = row as ArrayLike<unknown>;
	if (typeof arrayLike.length === "number") {
		return Array.prototype.slice.call(arrayLike);
	}
	return row;
}

function materializeResponse(response: unknown): unknown {
	if (!Array.isArray(response)) {
		return response;
	}
	return response.map(materializeRow);
}

export function safeUpstashCache(opts: UpstashOpts): UpstashCache {
	const base = upstashCache(opts);
	const originalPut = base.put.bind(base);
	base.put = (async (key, response, tables, isTag, config) =>
		originalPut(key, materializeResponse(response), tables, isTag, config)) as typeof base.put;
	return base;
}

export type { Cache };
