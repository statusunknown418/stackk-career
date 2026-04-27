const LEXO_DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LEXO_BASE = BigInt(LEXO_DIGITS.length);
const MIN_DIGIT = LEXO_DIGITS[0] ?? "0";

function assertValidLexoKey(key: string, label: "before" | "after"): void {
	if (key.length === 0) {
		throw new Error(`Invalid ${label} key: key cannot be empty`);
	}

	for (const character of key) {
		if (!LEXO_DIGITS.includes(character)) {
			throw new Error(`Invalid ${label} key: "${key}" contains unsupported character "${character}"`);
		}
	}
}

function normalizeLexoBound(bound: string | null | undefined, label: "before" | "after"): string | null {
	const key = bound ?? null;

	if (key !== null) {
		assertValidLexoKey(key, label);
	}

	return key;
}

function assertSortableBounds(lowerKey: string | null, upperKey: string | null): void {
	if (lowerKey !== null && upperKey !== null && lowerKey >= upperKey) {
		throw new Error(`Invalid key range: before key "${lowerKey}" must be less than after key "${upperKey}"`);
	}
}

function parseLexoKeyToInteger(key: string): bigint {
	let value = 0n;

	for (const character of key) {
		const digitIndex = LEXO_DIGITS.indexOf(character);

		if (digitIndex === -1) {
			throw new Error(`Invalid lexo key: "${key}"`);
		}

		value = value * LEXO_BASE + BigInt(digitIndex);
	}

	return value;
}

function alignLexoKeyToScale(key: string, scaleLength: number): bigint {
	const scaleDelta = scaleLength - key.length;

	if (scaleDelta < 0) {
		throw new Error(`Cannot align key "${key}" to smaller scale ${scaleLength}`);
	}

	return parseLexoKeyToInteger(key) * LEXO_BASE ** BigInt(scaleDelta);
}

function trimTrailingZeroDigits(value: string): string {
	let endIndex = value.length;

	while (endIndex > 0 && value[endIndex - 1] === MIN_DIGIT) {
		endIndex -= 1;
	}

	return value.slice(0, endIndex);
}

function encodeLexoIntegerAtScale(value: bigint, scaleLength: number): string {
	if (scaleLength <= 0) {
		throw new Error(`Scale length must be positive. Received ${scaleLength}`);
	}

	let remainder = value;
	const characters = new Array<string>(scaleLength).fill(MIN_DIGIT);

	for (let index = scaleLength - 1; index >= 0; index -= 1) {
		const digit = Number(remainder % LEXO_BASE);
		characters[index] = LEXO_DIGITS[digit] ?? MIN_DIGIT;
		remainder /= LEXO_BASE;
	}

	if (remainder !== 0n) {
		throw new Error(`Cannot encode value ${value.toString()} at scale ${scaleLength}`);
	}

	return trimTrailingZeroDigits(characters.join(""));
}

function getLexoRangeAtScale(
	lowerKey: string | null,
	upperKey: string | null,
	scaleLength: number
): { lowerValue: bigint; upperValue: bigint } {
	const scaleLimit = LEXO_BASE ** BigInt(scaleLength);

	return {
		lowerValue: lowerKey === null ? 0n : alignLexoKeyToScale(lowerKey, scaleLength),
		upperValue: upperKey === null ? scaleLimit : alignLexoKeyToScale(upperKey, scaleLength),
	};
}

function isCandidateBetweenBounds(candidateKey: string, lowerKey: string | null, upperKey: string | null): boolean {
	if (candidateKey.length === 0) {
		return false;
	}

	if (lowerKey !== null && candidateKey <= lowerKey) {
		return false;
	}

	if (upperKey !== null && candidateKey >= upperKey) {
		return false;
	}

	return true;
}

/**
 * Generate lexicographic position key between two existing keys.
 *
 * `before` and `after` can be `null` to represent start/end of list.
 * Returned key sorts strictly between provided neighbors.
 */
export function generateLexoKeyBetween(before?: string | null, after?: string | null): string {
	const lowerKey = normalizeLexoBound(before, "before");
	const upperKey = normalizeLexoBound(after, "after");

	assertSortableBounds(lowerKey, upperKey);

	let scaleLength = Math.max(lowerKey?.length ?? 0, upperKey?.length ?? 0, 1);

	while (true) {
		const { lowerValue, upperValue } = getLexoRangeAtScale(lowerKey, upperKey, scaleLength);

		if (lowerValue >= upperValue) {
			throw new Error(`No sortable space exists between "${lowerKey ?? "START"}" and "${upperKey ?? "END"}"`);
		}

		const gap = upperValue - lowerValue;

		if (gap <= 1n) {
			scaleLength += 1;
			continue;
		}

		const candidateValue = lowerValue + gap / 2n;
		const candidateKey = encodeLexoIntegerAtScale(candidateValue, scaleLength);

		if (!isCandidateBetweenBounds(candidateKey, lowerKey, upperKey)) {
			scaleLength += 1;
			continue;
		}

		return candidateKey;
	}
}
