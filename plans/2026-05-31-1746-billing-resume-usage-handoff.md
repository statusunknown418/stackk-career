# 2026-05-31 17:46 — Mercado Pago billing usage / stale billing sheet handoff

## User report

Production user upgraded to a new subscription, then generated a resume through `packages/jobs/src/lib/resume-parser/`. The billing sheet at `apps/web/src/components/domains/billing/billing-sheet.tsx` showed stale usage: `resume_creation_generations_per_cycle` did not reflect the new generation.

User preference captured during investigation: **never add `.test` files**. Do not create committed `*.test.*` files for follow-up verification.

## Findings

### Root cause 1 — invalid monthly usage window from Mercado Pago

`packages/api/src/services/mercadopago.ts` translated Mercado Pago preapproval state into the local `user_subscriptions` row. Mercado Pago can return the first authorized payment timestamp as `next_payment_date` on newly-created preapprovals. The previous code trusted that field directly as `currentPeriodEnd`.

Effect:

- `currentPeriodStart` was subscription creation / first charge time.
- `currentPeriodEnd` could be only minutes later on the same day.
- `resume_creation_generations_per_cycle` is period-scoped, so generations created after that bad same-day end were excluded.
- `resumes_total` could still show the created resume because it is all-time, not period-window-scoped.

Fix currently in workspace:

- New helper: `packages/api/src/services/billing-window.ts`
- `applyProviderCheckoutResult` now calls `deriveBillingWindow(...)`.
- The helper falls back to `addMonths(start, 1)` when provider end is missing or less than one day after the period start.
- Since backwards compatibility is not required, no read-time fallback was added for old broken rows.

### Root cause 2 — frontend did not invalidate billing after resume parser completion

Resume parser completion paths invalidated `orpc.resumes.list` but not billing/usage queries. If the billing sheet query was mounted or cached, it could show stale `snapshot.usage`.

Fix currently in workspace:

- New helper: `apps/web/src/lib/billing-cache.ts`
- Helper invalidates:
  - `orpc.billing.getSnapshot`
  - `orpc.viewer.usage`
- Hooked into:
  - `apps/web/src/components/domains/billing/billing-sheet.tsx`
  - `apps/web/src/components/domains/resumes/resume-create-dialog.tsx`
  - `apps/web/src/components/domains/resumes/resume-create-form.tsx`
  - `apps/web/src/components/domains/resumes/resume-pending-cards.tsx`
  - `apps/web/src/components/domains/resumes/resume-import-progress.tsx` type adjusted so completion remains synchronous at the component boundary.

## Production data repair needed

Deploying the code fixes future Mercado Pago subscription writes. It does **not** automatically repair the already-written production row.

For the affected production user, repair the existing `user_subscriptions` row:

- Set `currentPeriodStart` to the actual local period start / charge boundary.
- Set `currentPeriodEnd` to the real monthly renewal boundary, usually `addMonths(currentPeriodStart, 1)` unless Mercado Pago has a confirmed future renewal date.
- Then invalidate the user’s viewer subscription/usage cache.

Do not add long-lived compatibility logic for malformed historical periods unless product explicitly asks for it.

## Verification performed

- Removed the temporary `.test` file after the user rejected test files.
- Confirmed no `packages/api/src/**/*.test.*` files remain with `find`.
- Verified `deriveBillingWindow` behavior using inline Node instead of a committed test file:
  - `node --experimental-strip-types --input-type=module -e '...'`
  - Scenario: same-day Mercado Pago `nextPaymentDate` falls back to `2026-06-30T12:00:00.000Z` for start `2026-05-31T12:00:00.000Z`.
- Ran formatter on touched files:
  - `pnpm dlx ultracite fix ...`
- Built web successfully:
  - `SKIP_ENV_VALIDATION=true pnpm -F web build`

Known verification caveat:

- Full `tsc` for affected packages is blocked by existing duplicate Drizzle package-instance errors involving `packages/jobs` and `@opentelemetry/api` version skew. The failures predate this change path and are not specific to the billing-window/frontend-cache edits.

## Suggested next steps

1. Deploy the code changes.
2. Repair the affected production subscription row.
3. Invalidate production viewer subscription/usage cache for that user.
4. Re-open the billing sheet and confirm:
   - the new plan is active,
   - the reset date is the monthly renewal boundary,
   - `resume_creation_generations_per_cycle` includes the generated resume.

## Suggested skills for next agent

- `diagnose` — if production still shows stale usage after row repair/cache invalidation.
- `trigger-tasks` — if checking Trigger.dev resume-parser runs or replaying a run.
- `review-logging-patterns` — if adding structured logs around subscription state writes or billing snapshot reads.
