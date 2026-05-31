# Mercado Pago `CC_VAL_433` subscription handoff — 2026-05-31 13:48

Continues `plans/subscription-flow-debug-handoff.md` (prior session). Read that first for
the earlier `Card token service not found` (404, test-credentials) chapter, the Better
Auth/Kysely build mismatch, and the original billing-sheet inline-alert work. This doc only
covers the **new** `CC_VAL_433` chapter and supersedes the prior session's curated-error
approach.

## Suggested skills

- `diagnose` — continue the repro/probe loop if `CC_VAL_433` persists after the device-id fix.
- `caveman:caveman` (full) — user-active comms mode (see constraints).
- `better-auth-best-practices` — only if the unrelated Kysely/SSR build issue resurfaces.

## User preferences / constraints (still in force)

- **Caveman full** comms mode active until user says `stop caveman` / `normal mode`.
- **DO NOT ADD TESTS.** Verify via logic replicas in a REPL + lint + typecheck only.
- **DO NOT read or print `.env`.** User explicitly told us to stop mid-session. Only safe
  metadata was ever printed (present/length/12-char prefix/test-vs-prod). No secret values
  were logged. Do not read `.env` again without explicit permission.
- Keep the billing-sheet API minimal — avoid prop drilling / new props where a local read works.

## Current problem

Real card + confirmed **production** credentials + tiny sub price → deterministic 500:

```text
POST /api/rpc/billing/createSubscription 500
error chain (pre-fix): [{"message":"CC_VAL_433 Credit card validation has failed",
                         "code":"cc_rejected_other_reason","status":401}]
```

Mercado Pago webhook dashboard (Productivo) shows `payment.created` events delivered 200 —
i.e. MP *does* attempt the first authorized charge, then the card validation is declined.

## Findings

### Why it surfaced as an opaque 500

- MP Node SDK `mercadopago@3.0.0` throws the **raw API error body** (a plain object, not an
  `Error`) — `node_modules/.../mercadopago/dist/utils/restClient/index.js:134`
  (`throw await response.json()`).
- oRPC masks any thrown non-`ORPCError` value as a generic 500. The old
  `normalizeCreatePreapprovalError` only mapped `Card token service not found`, so every card
  decline fell through `throw error` → 500.

### Root-cause analysis of the decline (ruled out vs. live)

- **Ruled out — payer == collector.** User retried with a different payer email → same error.
- **Ruled out — test/prod key mix.** All MP keys classify as PROD (`APP_USR-`); backend
  `MERCADOPAGO_PUBLIC_KEY` and `VITE_MERCADOPAGO_PUBLIC_KEY` match each other.
- **Verified healthy (read-only MP API probe with the prod token, before the user asked us to
  stop touching `.env`):**
  - Account `1902332271`, site `MPE` (Peru), currency `PEN`.
  - PRO plan `0828b905643a4a0587c4f79bee20de31` and MAX plan `64a7cc2bc2e549aebd0a792542dd40bd`
    both `status: active`, `collector_id: 1902332271` (matches account), `application_id:
    5397720083783805`, `auto_recurring.transaction_amount: 2 PEN`, `frequency: 1 months`.
- **Leading live cause — missing device fingerprint.** MP antifraud rejects recurring-card
  validation (`CC_VAL_433 / cc_rejected_other_reason`) on `status:"authorized"` preapprovals
  when the `X-Meli-Session-Id` device id is absent. The code never sent it. MP docs:
  `mercadopago.com.mx/developers/en/docs/subscriptions/how-tos/improve-payment-approval/recommendations`.
- **Secondary live causes (not yet eliminated):**
  - 2 PEN first charge is a micro-charge → issuers may decline as suspicious. Lever: raise plan
    `transaction_amount`.
  - Genuine bank decline → try a different real card / bank.

### SDK plumbing verified (so the fix is grounded, not guessed)

- `@mercadopago/sdk-react` `initMercadoPago` → `@mercadopago/sdk-js` `loadMercadoPago` injects
  `https://sdk.mercadopago.com/js/v2`, which auto-sets `window.MP_DEVICE_SESSION_ID`.
- SDK `PreApproval.create({ requestOptions })` merges into `config.options`, spread into
  `RestClient.fetch`, which maps `meliSessionId` → header `X-Meli-Session-Id`
  (`restClient/index.js:102`; type `Options.meliSessionId?: string` in `dist/types.d.ts:40`).

## Changes made this session

1. `packages/api/src/services/mercadopago.ts`
   - Replaced the curated-Spanish-copy error mapping (removed `CARD_REJECTION_MESSAGES`,
     `GENERIC_CARD_REJECTION_MESSAGE`, `isCardTokenServiceNotFound`, `findCardRejectionCode`,
     and the card-token-not-found constants) with a generic passthrough per user request
     ("just show it anyhow"): `mercadopagoApiErrorMessage()` extracts MP's own message off the
     thrown body / `cause` / `response`; `normalizeCreatePreapprovalError()` rethrows it as
     `ORPCError("BAD_REQUEST", { message, cause: <mp body> })`. Real `Error`s (network/timeout)
     are rethrown unchanged → genuine 5xx. The MP body is kept as `cause` so logs retain
     `code`/`status`.
   - Added `CreateSubscriptionInput.deviceId?: string`; `createPreapproval` now sends
     `requestOptions.meliSessionId: input.deviceId`.
2. `packages/schemas/src/api/billing.ts` — `createSubscriptionInputSchema.deviceId:
   z.string().min(1).optional()`.
3. `packages/api/src/routers/billing.ts` — both `createSubscription` and `changePlan` pass
   `deviceId: input.deviceId` to `createPreapproval`.
4. `apps/web/src/components/domains/billing/payment-brick.tsx` — `onSubmit` reads
   `window.MP_DEVICE_SESSION_ID` and forwards it; `onTokenReady` arg type gains
   `deviceId: string | undefined`.
5. `apps/web/src/components/domains/billing/billing-sheet.tsx` — `submitCheckout` destructures
   `deviceId` and forwards it to `mutateAsync`.

`deviceId` is optional end-to-end: when the device id is absent no header is sent (no
regression vs. prior behaviour).

### Not ours (pre-existing edits seen in the worktree)

- `billing-sheet.tsx` `submitCheckout` already had `backUrl` rewritten by the user to swap
  `localhost` for `https://unoutspoken-arty-clayton.ngrok-free.dev/` (MP needs a public https
  `back_url`), and the trailing `.catch(() => undefined)` removed. Left untouched.

## Verification run

- LSP diagnostics OK on all 5 changed files.
- `pnpm dlx ultracite check` clean on all 5 changed files.
- Error-matcher / message-extractor logic validated against the exact observed payload shapes
  in a JS REPL replica (not committed — no test files).
- NOT verified end-to-end: cannot reproduce a real-card MP decline locally. The device-id fix
  is structurally verified (SDK header plumbing) but MP antifraud approval is not guaranteed.

## Next steps

1. User to retry the real-card flow in-browser. With the passthrough fix, any remaining failure
   now shows MP's real message inline instead of a 500 — capture that message.
2. If still `CC_VAL_433`: raise the MP plan `transaction_amount` above the micro-charge floor
   (~5–10 PEN) and/or try a different card/bank.
3. Confirm `window.MP_DEVICE_SESSION_ID` is actually populated at submit time (DevTools console)
   — if empty, the header isn't being sent and the device-id script load needs investigating.
4. Do not add tests; do not read `.env`; keep caveman full.
