import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@trigger.dev/sdk";
import { config } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(here, "../../.env"), quiet: true });

const projectRef = process.env.TRIGGER_PROJECT_ID;

if (!projectRef) {
	throw new Error("TRIGGER_PROJECT_ID missing in root .env");
}

export default defineConfig({
	project: projectRef,
	dirs: ["./src/trigger"],
	maxDuration: 3600,
	runtime: "node",
	logLevel: "info",
	retries: {
		default: {
			maxAttempts: 3,
			factor: 2,
			randomize: true,
		},
	},
	build: {
		extensions: [],
	},
});
