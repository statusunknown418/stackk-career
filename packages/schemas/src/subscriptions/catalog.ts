import type { EntitlementMap, PlanId } from "./types";
import { unlimitedSentinel } from "./types";

export interface PlanCatalogEntry {
	displayName: string;
	entitlements: EntitlementMap;
	id: PlanId;
}

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
	free: {
		id: "free",
		displayName: "Free",
		entitlements: {
			resumes_total: 1,
			resume_creation_generations_per_cycle: 1,
			conversation_generations_per_cycle: 0,
			resume_analyses_per_cycle: 3,
			messages_per_generation: 10,
			coaching_sessions_per_cycle: 0,
		},
	},
	pro: {
		id: "pro",
		displayName: "Pro",
		entitlements: {
			resumes_total: 3,
			resume_creation_generations_per_cycle: 3,
			conversation_generations_per_cycle: unlimitedSentinel,
			resume_analyses_per_cycle: unlimitedSentinel,
			messages_per_generation: 50,
			coaching_sessions_per_cycle: 1,
		},
	},
	max: {
		id: "max",
		displayName: "Max",
		entitlements: {
			resumes_total: 100,
			resume_creation_generations_per_cycle: 100,
			conversation_generations_per_cycle: 100,
			resume_analyses_per_cycle: 500,
			messages_per_generation: 500,
			coaching_sessions_per_cycle: 3,
		},
	},
};

export const PLAN_IDS: readonly PlanId[] = ["free", "pro", "max"];
