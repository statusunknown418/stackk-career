import assert from "node:assert/strict";
import test from "node:test";

import { generateLexoKeyBetween } from "./indexing.ts";

const betweenCases = [
	{
		name: "creates first key in empty list",
		before: null,
		after: null,
	},
	{
		name: "creates key before first item",
		before: null,
		after: "1",
	},
	{
		name: "creates key after last item",
		before: "1",
		after: null,
	},
	{
		name: "creates key between adjacent top-level keys",
		before: "1",
		after: "2",
	},
	{
		name: "creates key when upper bound extends lower bound prefix",
		before: "1",
		after: "11",
	},
	{
		name: "creates key between denser fractional keys",
		before: "0V",
		after: "1",
	},
];

function assertKeyIsBetween({ before, after, key }) {
	assert.notEqual(key.length, 0, "generated key must not be empty");

	if (before !== null) {
		assert.ok(before < key, `expected "${before}" < "${key}"`);
	}

	if (after !== null) {
		assert.ok(key < after, `expected "${key}" < "${after}"`);
	}
}

test("generateLexoKeyBetween returns sortable key between bounds", async (t) => {
	for (const testCase of betweenCases) {
		await t.test(testCase.name, () => {
			const key = generateLexoKeyBetween(testCase.before, testCase.after);

			assertKeyIsBetween({
				before: testCase.before,
				after: testCase.after,
				key,
			});
		});
	}
});

test("generateLexoKeyBetween supports repeated inserts into same gap", () => {
	const after = "1";
	let before = null;

	for (let index = 0; index < 8; index += 1) {
		const key = generateLexoKeyBetween(before, after);

		assertKeyIsBetween({
			before,
			after,
			key,
		});

		before = key;
	}
});

test("generateLexoKeyBetween rejects invalid ranges", () => {
	assert.throws(() => generateLexoKeyBetween("2", "1"), {
		message: 'Invalid key range: before key "2" must be less than after key "1"',
	});
});

test("generateLexoKeyBetween rejects unsupported characters", () => {
	assert.throws(() => generateLexoKeyBetween("a-", null), {
		message: 'Invalid before key: "a-" contains unsupported character "-"',
	});
});
