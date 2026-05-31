# Quota Double-Query Fix — Handoff

## Goal
Investigate and fix "double queries" in `packages/api/src/routers/` tied to the new payments/quota feature. Root cause was a duplicated subscription read per request; fix shipped. The user then renamed the new functions and asked whether the per-key check loop is correct and efficient (assessment only — no change applied yet).

## Constraints & Preferences
- Project uses **Ultracite/Biome** (`pnpm dlx ultracite fix` / `check`). Tab indent, double quotes, line width 120. `noAwaitInLoops: "off"` (await-in-loop is allowed). Never use `biome-ignore`, `@ts-expect-error`. JSDoc for comments. Prefer self-documenting code.
- pnpm monorepo + turbo. `@stackk-career/*` workspace packages.
- User wants tight, evidence-based reasoning; firm recommendations, no thrashing. Don't inflate scope — the last turn was a request for *assessment*, so no code was changed.

## Progress
### Done
- [x] Diagnosed double-query: `assertQuota` was self-contained — each call ran `getActiveSubscriptionForUser` (a `$withCache` read of `SELECT * FROM user_subscriptions WHERE userId = ? LIMIT 1`) + recomputed entitlements. Two routes gated **two** limits back-to-back, so the subscription row was read twice per request.
- [x] Confirmed `context.db` (`packages/api/src/context.ts`) is the process-wide `db` singleton — **no request-scoped memoization**, so the second read is a real round-trip (warm = redundant Redis GET; cold = duplicate libSQL query, can race).
- [x] Refactored `packages/api/src/services/subscriptions.ts`: extracted private `assertLimit(db, userId, limitKey, subscription, entitlements, context)`; slimmed `assertQuota` to fetch subscription/entitlements once + delegate; added `assertQuotas(db, userId, limitKeys[], context?)` that fetches subscription/entitlements once then loops `assertLimit` in array order.
- [x] Updated the two double-call sites to batch:
  - `packages/api/src/routers/resumes.ts:86` → `assertQuotas(context.db, userId, ["resumes_total", "resume_creation_generations_per_cycle"])` (import switched to `assertQuotas`).
  - `packages/api/src/routers/agents.ts:255` (`triggerK02ParseResume`) → same batched call (import now `assertQuota, assertQuotas` — `assertQuota` still used at lines 34 and 149).
- [x] Verified: `lsp diagnostics` clean on all 3 files; `cd packages/api && pnpm exec tsc --noEmit -p tsconfig.json` passed (no output, exit 0); final search confirmed no remaining back-to-back `assertQuota` sites.
- [x] **User then renamed** (their own edit): `assertQuota` → `assertSingleQuota`, `assertQuotas` → `assertMultipleQuotas`. `assertLimit` kept. Verified current file state reflects renames (call sites in resumes.ts/agents.ts use the renamed `assertMultipleQuotas`/`assertSingleQuota`).
- [x] Delivered assessment of the loop: **correct and appropriately efficient**; recommended keeping sequential for the current 2-key sites, with a parallel variant offered as opt-in.

### In Progress
- [ ] Awaiting user decision on the open question below.

### Pending
- [ ] User asked: "Want me to apply the parallel variant anyway?" — **not yet answered.** If yes, parallelize counter reads in `assertMultipleQuotas`.

## Key Decisions
- **Batch via `assertMultipleQuotas`, fetch subscription once**: kills the duplicate `user_subscriptions` read while keeping `assertSingleQuota` for single-limit routes.
- **Keep the per-key loop sequential (recommended)**: counters are cache-first (`$withCache`, 300s TTL); serializing 2 warm reads ≈ 1 RTT. Sequential preserves the gate's stop-at-first-failure short-circuit (over-quota user never triggers the 2nd read) and deterministic 403-over-500 precedence. `getUsageSnapshot` parallelizes its 5 reads only because it *always* needs all of them — different semantics.
- **Single-key sites left untouched**: generations.ts:31, messages.ts:38, suggestions.ts:46, coaching-bookings.ts:51, agents.ts:34/149 — each already a single subscription read.
- **`getUsageSnapshot` left as-is** (billing/viewer routers): its 1 subscription + 5 counter reads are distinct, not duplicates.

## Critical Context
- Current `assertMultipleQuotas` loop (`packages/api/src/services/subscriptions.ts` ~line 317):
  ```ts
  for (const limitKey of limitKeys) {
      await assertLimit(db, userId, limitKey, subscription, entitlements, context);
  }
  ```
- Types (`packages/schemas/src/subscriptions/`): `LimitValue = number | "unlimited"`; `isUnlimited(value: LimitValue): value is "unlimited"` (so post-guard `limit` narrows to `number`); `hasQuotaRemaining(limit: LimitValue, currentUsage: number)`; `LimitKey` enum; `CachedUsageLimitKey` subset; `EntitlementMap`. `buildQuotaError`'s payload `limit` accepts `number`.
- Cache layer: `packages/db/src/index.ts` uses `safeUpstashCache` (Upstash Redis-backed drizzle cache) — process-wide, not per-request. Tags: `viewer:subscription:<userId>` (`viewerSubscriptionTag`) and `viewerUsageTag(userId, metric)` in `packages/api/src/lib/viewer-cache.ts`.
- **Parallel variant** (apply only if user says yes) — read concurrently, evaluate in array order to preserve precedence:
  ```ts
  const usages = await Promise.all(
      limitKeys.map(async (limitKey) => {
          const limit = entitlements[limitKey];
          if (isUnlimited(limit)) {
              return null;
          }
          const currentUsage = await readCurrentUsage(db, userId, limitKey, subscription, context);
          return { currentUsage, limit, limitKey }; // limit: number here
      })
  );
  for (const usage of usages) {
      if (usage && !hasQuotaRemaining(usage.limit, usage.currentUsage)) {
          throw buildQuotaError({ code: "QUOTA_EXCEEDED", currentPeriodEnd: subscription.currentPeriodEnd, currentUsage: usage.currentUsage, limit: usage.limit, limitKey: usage.limitKey, planId: getEffectivePlanId(subscription) });
      }
  }
  ```
  Tradeoff if applied: lower happy-path/cold-cache latency, but reads all counters even when an earlier limit is exhausted, and `Promise.all` could surface a 500 instead of 403 if a later read errors while an earlier limit is over. To stay DRY, extract `enforceLimit(subscription, limitKey, limit: number, currentUsage)` and reuse in both `assertLimit` and the loop.

## Next Steps
1. If user answers **yes**: apply the parallel variant in `assertMultipleQuotas` (with `enforceLimit` extraction for DRY), then re-run `cd packages/api && pnpm exec tsc --noEmit -p tsconfig.json` + `lsp diagnostics`.
2. If **no/keep**: no code change; the fix is complete and verified.
3. Optionally run `pnpm dlx ultracite check` on the 3 edited files before considering done.
