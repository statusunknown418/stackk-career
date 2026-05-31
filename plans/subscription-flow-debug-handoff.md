# Subscription flow debug handoff

## Suggested skills

- `diagnose` — continue bug investigation with repro/probe loop.
- `better-auth-best-practices` — if touching Better Auth/Kysely/build issue.
- `impeccable` or `web-design-guidelines` — if refining billing sheet alert UX.

## User preferences / constraints

- Caveman/full terse response mode active unless user says `stop caveman` or `normal mode`.
- User explicitly said: **DO NOT ADD ANY TESTS**.
- User objected to added props/prop drilling. Keep billing sheet API minimal; prefer local render/state placement over passing more props through components.
- Do not read or print full `.env` secrets. During prior diagnosis, only safe metadata was printed: present/length/prefix/test-vs-prod classification, no full values.

## Original problem

User saw subscription test flow fail:

```text
POST /api/rpc/billing/createSubscription 500
error: chain=[{"message":"Card token service not found","status":404}]
message=[object Object]
```

Stack pointed through:

- `apps/web/src/routes/api/rpc/$.ts`
- `packages/schemas/src/utils/to-error.ts`
- `packages/api/src/routers/billing.ts`
- `packages/api/src/services/mercadopago.ts`

## Findings

### Mercado Pago root cause

Code path:

- `billing.createSubscription`
- `createPreapproval()`
- Mercado Pago `PreApproval.create()` / `POST /preapproval`
- payload includes `preapproval_plan_id`, `card_token_id`, `payer_email`, `status: "authorized"`

Observed/probed:

- Mercado Pago plan IDs were valid and active under configured access token.
- Fresh test card token was created via `/v1/card_tokens`.
- Calling `/preapproval` with that token reproduced exact MP response:

```json
{"message":"Card token service not found","status":404}
```

Official MP doc says this error normally appears when using test credentials for subscriptions. Do not include secrets in further notes.

### Logging secondary issue

`packages/schemas/src/utils/to-error.ts` previously did:

```ts
new Error(String(error))
```

For object errors this caused:

```text
Error: [object Object]
```

So real MP message was hidden in logs.

### Kysely build issue

`pnpm -F web build` client build passed, SSR build failed for unrelated Better Auth dependency mismatch:

```text
[MISSING_EXPORT] "DEFAULT_MIGRATION_LOCK_TABLE" is not exported by .../kysely/dist/index.js
[MISSING_EXPORT] "DEFAULT_MIGRATION_TABLE" is not exported by .../kysely/dist/index.js
```

Reason found:

- App uses `better-auth/adapters/drizzle` in `packages/auth/src/index.ts`.
- Better Auth still imports/exports Kysely internals in package runtime paths:
  - `better-auth/dist/context/init.mjs`
  - `better-auth/dist/db/get-migration.mjs`
  - `@better-auth/kysely-adapter`
- Installed `@better-auth/kysely-adapter@1.6.12` expects Kysely exports removed/missing in installed `kysely@0.29.2`.
- This is not caused by subscription changes.

## Updates made in current worktree

### `packages/api/src/services/mercadopago.ts`

Added mapping for MP card token 404:

- Detects `"Card token service not found"` on thrown error object, nested `cause`, or nested `response`.
- Converts to clean `ORPCError("BAD_REQUEST")` with message:

```text
Mercado Pago rechazó el token de tarjeta para suscripciones. Si estás probando con credenciales TEST-*, este flujo no crea suscripciones autorizadas con tarjeta.
```

- `createPreapproval()` now wraps SDK call in `try/catch` and calls `normalizeCreatePreapprovalError()`.

### `packages/schemas/src/utils/to-error.ts`

Changed legacy unknown-error normalizer:

- Existing `Error` returned unchanged.
- Object with `message` + `status` becomes `message (status N)`.
- Object with `message` + `code` becomes `message (code)`.
- Object without message JSON-stringified.
- Original object stored as `cause`.
- `name` and `stack` copied when present.

Important design note: user questioned why this util exists instead of evlog normalizer. Finding: evlog has `createError()` / `EvlogError`, but no generic exported "normalize unknown thrown value to Error" util. `RequestLogger.error()` accepts `Error | string`, while many catch paths receive `unknown`. Still, `toError` in `@stackk-career/schemas` is probably wrong layering. Better future direction: use domain errors (`ORPCError`, `createError`) at source; keep tiny local unknown-to-message helpers near catch boundaries; reduce/remove shared `toError` over time.

### `apps/web/src/components/domains/billing/billing-sheet.tsx`

Added inline sheet alerts while retaining toasts:

- Payment Brick load/render errors stay inside `PlanCheckout` local state (`brickError`) and render alert above brick.
- Checkout mutation errors live in parent `BillingSheetContent` because mutations are there; alert is rendered directly in `SheetPanel` above `PlanCheckout` instead of passing `errorMessage` prop into `PlanCheckout`.
- This addressed user request to avoid adding props/prop drilling.
- `PlanCheckout` props remain only:
  - `onTokenReady`
  - `payerEmail`
  - `planId`

No test files should exist from this work. A briefly-added `packages/schemas/src/utils/to-error.test.mjs` was removed after user said no tests.

## Verification already run

Passing:

```bash
pnpm dlx ultracite check packages/schemas/src/utils/to-error.ts packages/api/src/services/mercadopago.ts apps/web/src/components/domains/billing/billing-sheet.tsx
pnpm -F @stackk-career/schemas check-types
```

Failed / unrelated:

```bash
pnpm exec tsc -p packages/schemas/tsconfig.json --noEmit && pnpm exec tsc -p packages/api/tsconfig.json --noEmit && pnpm exec tsc -p apps/web/tsconfig.json --noEmit
```

Failure came from pre-existing duplicate Drizzle/otel type graph involving `packages/jobs/*`, not changed files.

```bash
pnpm -F web build
```

Client build passed. SSR failed on Better Auth/Kysely missing exports as described above.

## Current worktree caution

Worktree contains many pre-existing/unrelated modified and untracked files. Do not revert/stash. Relevant files touched by this session:

- `packages/schemas/src/utils/to-error.ts`
- `packages/api/src/services/mercadopago.ts`
- `apps/web/src/components/domains/billing/billing-sheet.tsx`
- `plans/subscription-flow-debug-handoff.md` (this file)

Other billing/subscription files are untracked/modified but appear pre-existing from broader subscription work; inspect before editing.

## Recommended next steps

1. Decide whether to keep `toError` patch or replace call sites with evlog/domain-specific error handling. User is skeptical of shared `toError`.
2. If keeping UX fix, manually re-run subscription flow in browser/dev server to confirm inline alert shows in sheet on MP 404.
3. Resolve Better Auth/Kysely version mismatch separately if build must pass:
   - align `@better-auth/*` and `kysely` versions, or
   - configure SSR bundling/externalization if compatible, or
   - use Better Auth guidance/docs before changing auth deps.
4. Do not add tests unless user reverses explicit instruction.
