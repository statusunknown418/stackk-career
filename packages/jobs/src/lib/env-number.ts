/**
 * Lee una env var numérica con default seguro. `Number("4m")` da NaN, y NaN se
 * propaga en silencio: `AbortSignal.timeout(NaN)` lanza TypeError en cada attempt,
 * `stepCountIs(NaN)` y `concurrencyLimit: NaN` quedan indefinidos. Un valor no
 * numérico cae al default en vez de tumbar el task por una env mal seteada.
 */
export function envNumber(raw: string | undefined, fallback: number): number {
	if (raw === undefined) {
		return fallback;
	}
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : fallback;
}
