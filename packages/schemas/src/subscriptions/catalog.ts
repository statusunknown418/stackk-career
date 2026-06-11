import type { EntitlementMap, PlanId } from "./types";

export interface PlanCatalogEntry {
	displayName: string;
	entitlements: EntitlementMap;
	id: PlanId;
	/**
	 * Monthly price in PEN. Single source of truth for the server charge config display and the
	 * Mercado Pago Payment Brick `amount`. The recurring charge is still governed by the MP
	 * associated plan (`preapproval_plan_id`) — keep this in sync with the MP dashboard.
	 */
	priceMonthlyPen: number;
}

/**
 * @description Per-plan entitlements — the single source of truth for what each gate allows. A numeric value is
 * a hard limit; `unlimitedSentinel` (`"unlimited"`) means no cap. `assertQuota` reads these to block
 * the matching mutation once usage reaches the limit.
 *
 * What each resource gates, its counting scope, and where it is enforced:
 *
 * - **`resumes_total`** — Total resumes a user may own, manual or AI. All-time count (NOT reset per
 *   cycle), derived from the `resumes` table. Enforced at `resumes.create` and
 *   `agents.triggerK02ParseResume` (upload/parse).
 *
 * - **`resume_creation_generations_per_cycle`** — AI-generated-from-source resumes started per billing
 *   cycle (the PDF/upload parser path), counted from `generations` WHERE `type = "resume-creation"`
 *   within the period. Enforced at `generations.create` (non-conversation) and
 *   `agents.triggerK02ParseResume`. Manual `resumes.create` does NOT consume this — manual resumes
 *   insert a `resume-manual` generation and are bounded only by `resumes_total`.
 *
 * - **`conversation_generations_per_cycle`** — Chat/conversation generations started per billing cycle,
 *   counted from `generations` WHERE `type = "conversation"`. Enforced at `generations.create` (conversation).
 *
 * - **`resume_analyses_per_cycle`** — Resume analyses (fast + detailed) run per billing cycle, counted from
 *   `resume_analyses` excluding `status = "failed"`. Enforced at `agents.triggerK02FastAnalysis` and
 *   `agents.triggerK02DetailedAnalysis`.
 *
 * - **`resume_inline_ai_suggestions`** — Inline "Generar" AI suggestions for a single resume block
 *   (descriptions, summaries, etc.) requested per billing cycle, counted from `messages` WHERE
 *   `objectType = "resume-suggestion"` AND `isAssistant = false` (one row written per request), scoped to
 *   the user via `generations.owner`. Enforced at `suggestions.prepareSuggestion`.
 *
 * - **`messages_per_generation`** — User-authored messages (`isAssistant = false`) allowed within a SINGLE
 *   generation. Per-generation, NOT per-cycle, and read live (excluded from the cached counters). Enforced
 *   at `messages.create` and `suggestions.prepareSuggestion` (each suggestion writes one counted message).
 *
 * - **`coaching_sessions_per_cycle`** — Coaching bookings per billing cycle, counted from `coaching_sessions`
 *   excluding `bookingStatus = "cancelled"`. Enforced at `coaching-bookings.captureBooking`.
 *
 * - **`cover_letter_versions`** — Cover-letter versions (regenerations) allowed within a SINGLE letter.
 *   Per-letter, NOT per-cycle: counted live from non-failed cover-letter artifacts on that generation.
 *   Enforced at `letters.trigger`.
 */
export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
	free: {
		id: "free",
		displayName: "Free",
		priceMonthlyPen: 0,
		entitlements: {
			resumes_total: 2,
			resume_creation_generations_per_cycle: 1,
			conversation_generations_per_cycle: 0,
			resume_analyses_per_cycle: 3,
			resume_inline_ai_suggestions: 3,
			messages_per_generation: 10,
			coaching_sessions_per_cycle: 0,
			cover_letter_versions: 5,
		},
	},
	pro: {
		id: "pro",
		displayName: "Pro",
		priceMonthlyPen: 79,
		entitlements: {
			resumes_total: 3,
			resume_creation_generations_per_cycle: 3,
			conversation_generations_per_cycle: 75,
			resume_analyses_per_cycle: 50,
			resume_inline_ai_suggestions: 150,
			messages_per_generation: 50,
			coaching_sessions_per_cycle: 1,
			cover_letter_versions: 20,
		},
	},
	max: {
		id: "max",
		displayName: "Max",
		priceMonthlyPen: 179,
		entitlements: {
			resumes_total: 100,
			resume_creation_generations_per_cycle: 100,
			conversation_generations_per_cycle: 150,
			resume_analyses_per_cycle: 500,
			resume_inline_ai_suggestions: 500,
			messages_per_generation: 500,
			coaching_sessions_per_cycle: 3,
			cover_letter_versions: 50,
		},
	},
};
