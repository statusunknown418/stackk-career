import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getTableName, isTable, sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const { db } = await import("../index");
const schema = await import("../schema");

interface TableNameRow {
	name: string;
}

interface ForeignKeyRow {
	table: string;
}

const systemTableNames = new Set(["__drizzle_migrations", "sqlite_sequence"]);
const systemTablePrefixes = ["sqlite_"] as const;

const uniqueSorted = (names: Iterable<string>) => [...new Set(names)].sort((a, b) => a.localeCompare(b));

const isResettableTableName = (name: string) =>
	!(systemTableNames.has(name) || systemTablePrefixes.some((prefix) => name.startsWith(prefix)));

const getSchemaTableNames = () =>
	uniqueSorted(
		Object.values(schema as Record<string, unknown>).flatMap((value) => (isTable(value) ? [getTableName(value)] : []))
	);

const getDatabaseTableNames = async () => {
	const rows = await db.all<TableNameRow>(sql`
		select name
		from sqlite_schema
		where type = 'table'
		order by name
	`);

	return uniqueSorted(rows.map(({ name }) => name).filter(isResettableTableName));
};

const hasSqliteSequenceTable = async () => {
	const row = await db.get<TableNameRow | undefined>(sql`
		select name
		from sqlite_schema
		where type = 'table' and name = 'sqlite_sequence'
	`);

	return Boolean(row);
};

const getReferencedTableNames = async (tableName: string, resettableTableNames: Set<string>) => {
	const rows = await db.all<ForeignKeyRow>(sql`pragma foreign_key_list(${sql.identifier(tableName)})`);

	return uniqueSorted(
		rows
			.map(({ table }) => table)
			.filter(
				(referencedTableName) => referencedTableName !== tableName && resettableTableNames.has(referencedTableName)
			)
	);
};

const getDeleteOrder = async (tableNames: string[]) => {
	const resettableTableNames = new Set(tableNames);
	const referencesByTable = new Map<string, Set<string>>();
	const referencedByTable = new Map<string, Set<string>>();

	for (const tableName of tableNames) {
		referencesByTable.set(tableName, new Set());
		referencedByTable.set(tableName, new Set());
	}

	for (const tableName of tableNames) {
		const referencedTableNames = await getReferencedTableNames(tableName, resettableTableNames);
		referencesByTable.set(tableName, new Set(referencedTableNames));

		for (const referencedTableName of referencedTableNames) {
			referencedByTable.get(referencedTableName)?.add(tableName);
		}
	}

	const incomingReferenceCounts = new Map(
		tableNames.map((tableName) => [tableName, referencedByTable.get(tableName)?.size ?? 0])
	);
	const readyTableNames = tableNames.filter((tableName) => incomingReferenceCounts.get(tableName) === 0);
	const deleteOrder: string[] = [];

	while (readyTableNames.length > 0) {
		const tableName = readyTableNames.shift();
		if (!tableName) {
			continue;
		}

		deleteOrder.push(tableName);

		for (const referencedTableName of referencesByTable.get(tableName) ?? []) {
			const nextCount = (incomingReferenceCounts.get(referencedTableName) ?? 0) - 1;
			incomingReferenceCounts.set(referencedTableName, nextCount);

			if (nextCount === 0) {
				readyTableNames.push(referencedTableName);
				readyTableNames.sort((a, b) => a.localeCompare(b));
			}
		}
	}

	if (deleteOrder.length === tableNames.length) {
		return deleteOrder;
	}

	const orderedTableNames = new Set(deleteOrder);
	return [...deleteOrder, ...tableNames.filter((tableName) => !orderedTableNames.has(tableName))];
};

const skipPrompt = process.argv.includes("--yes") || process.argv.includes("-y");
const dbUrl = process.env.DATABASE_URL ?? "<unknown>";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force-prod")) {
	console.error("Refusing to wipe production. Pass --force-prod to override.");
	process.exit(1);
}

if (!skipPrompt) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	console.log(`\nAbout to WIPE all data from:\n  ${dbUrl}\n`);
	const answer = await rl.question('Type "RESET" to confirm: ');
	rl.close();
	if (answer.trim() !== "RESET") {
		console.log("Aborted.");
		process.exit(0);
	}
}

const reset = async () => {
	const schemaTableNames = getSchemaTableNames();
	const schemaTableNameSet = new Set(schemaTableNames);
	const databaseTableNames = await getDatabaseTableNames();
	const deleteOrder = await getDeleteOrder(databaseTableNames);
	const missingDatabaseTableNames = schemaTableNames.filter((tableName) => !databaseTableNames.includes(tableName));
	const databaseOnlyTableNames = databaseTableNames.filter((tableName) => !schemaTableNameSet.has(tableName));
	const shouldResetSequence = await hasSqliteSequenceTable();

	if (databaseTableNames.length === 0) {
		console.log("\nNo resettable tables found.");
		return;
	}

	if (missingDatabaseTableNames.length > 0) {
		console.warn(`\nSchema tables missing from database: ${missingDatabaseTableNames.join(", ")}`);
	}

	if (databaseOnlyTableNames.length > 0) {
		console.warn(`\nDatabase-only tables will be wiped too: ${databaseOnlyTableNames.join(", ")}`);
	}

	console.log("\nWiping tables...");
	await db.transaction(async (tx) => {
		await tx.run(sql`pragma defer_foreign_keys = on`);

		for (const tableName of deleteOrder) {
			await tx.run(sql`delete from ${sql.identifier(tableName)}`);
			console.log(`  - ${tableName} cleared`);
		}

		if (shouldResetSequence) {
			const tableNameParams = deleteOrder.map((tableName) => sql`${tableName}`);
			await tx.run(sql`delete from sqlite_sequence where name in (${sql.join(tableNameParams, sql`, `)})`);
		}
	});
};

try {
	await reset();
	console.log("\nDone. Database is fresh.");
	process.exit(0);
} catch (error) {
	console.error("\nReset failed.");
	console.error(error);
	process.exit(1);
}
