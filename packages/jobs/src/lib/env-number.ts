/**
 * Read a numeric env var with a safe default. `Number("4m")` is NaN, which propagates
 * silently: `AbortSignal.timeout(NaN)` throws on every attempt, `stepCountIs(NaN)` and
 * `concurrencyLimit: NaN` are undefined behavior. Non-numeric values fall back instead
 * of crashing the task over a misconfigured env.
 */
export function envNumber(raw: string | undefined, fallback: number): number {
	// Empty string also falls back: Number("") is 0 (finite), so a declared-but-empty env
	// (`FOO=` in a .env) would silently mean concurrency 0 or timeout 0.
	if (raw === undefined || raw.trim() === "") {
		return fallback;
	}
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : fallback;
}
