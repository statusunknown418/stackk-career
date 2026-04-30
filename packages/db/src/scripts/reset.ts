import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const { db } = await import("../index");
const schema = await import("../schema");

const tables = [
	{ name: "resumeBlocks", table: schema.resumeBlocks },
	{ name: "messages", table: schema.messages },
	{ name: "resumes", table: schema.resumes },
	{ name: "generations", table: schema.generations },
	{ name: "fileMetadata", table: schema.fileMetadata },
	{ name: "onboardingProfile", table: schema.onboardingProfile },
	{ name: "session", table: schema.session },
	{ name: "account", table: schema.account },
	{ name: "verification", table: schema.verification },
	{ name: "user", table: schema.user },
] as const;

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

console.log("\nWiping tables...");
for (const { name, table } of tables) {
	await db.delete(table);
	console.log(`  - ${name} cleared`);
}
console.log("\nDone. Database is fresh.");
process.exit(0);
