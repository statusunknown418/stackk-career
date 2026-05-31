# Mercado Pago `CC_VAL_433` subscription handoff — 2026-05-31 13:48

Continues `plans/subscription-flow-debug-handoff.md` (prior session). Read that first for
the earlier `Card token service not found` (404, test-credentials) chapter, the Better
Auth/Kysely build mismatch, and the original billing-sheet inline-alert work. This doc only
covers the **new** `CC_VAL_433` chapter and supersedes the prior session's curated-error
approach.

A later working session the same day shifted focus from the decline itself to the checkout
**submit UX** (in-flight loading state) and a **prop-drilling refactor** of the billing sheet —
see **Session 2** below. The `Findings`, `Session 1 changes`, and `Session 1 verification`
sections below are unchanged and still describe the device-id / error-passthrough work.

## Suggested skills

- `diagnose` — continue the repro/probe loop if `CC_VAL_433` persists after the device-id fix.
- `caveman:caveman` (full) — user-active comms mode (see constraints).
- `better-auth-best-practices` — only if the unrelated Kysely/SSR build issue resurfaces.

## User preferences / constraints (still in force)

- **Comms mode:** caveman was **not** used in the later (Session 2) work — user and agent both
  wrote in normal English, and the user never re-invoked it. Treat caveman as effectively off
  unless the user explicitly turns it back on.
- **DO NOT ADD TESTS.** Verify via logic replicas in a REPL + lint + typecheck only.
- **DO NOT read or print `.env`.** User explicitly told us to stop mid-session. Only safe
  metadata was ever printed (present/length/12-char prefix/test-vs-prod). No secret values
  were logged. Do not read `.env` again without explicit permission.
- **Keep the billing-sheet API minimal — avoid prop drilling** (strongly reconfirmed in
  Session 2). Pass props through *consumers only*; never thread a prop through a component that
  does not use it. Prefer **local reads**: react-query caches mean `useQuery(getSnapshot)`
  returns the same cached snapshot from any component; `authClient.useSession()` reads the
  session anywhere; extract small shared hooks (e.g. `useRefreshBilling`) instead of passing
  callbacks down.
- **Do NOT use React Context / `useContext`** to fix drilling — user explicitly forbade it.
  Use local hook reads or co-location instead.
- **Semantic HTML, minimal divs** (also a standing project rule in `~/.gemini/GEMINI.md`): reach
  for `section` / `article` / `footer` / `p` etc., and drop redundant wrappers when a single
  element already carries the needed classNames.

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

## Session 1 changes — device-id + error passthrough (13:48)

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

## Session 1 verification

- LSP diagnostics OK on all 5 changed files.
- `pnpm dlx ultracite check` clean on all 5 changed files.
- Error-matcher / message-extractor logic validated against the exact observed payload shapes
  in a JS REPL replica (not committed — no test files).
- NOT verified end-to-end: cannot reproduce a real-card MP decline locally. The device-id fix
  is structurally verified (SDK header plumbing) but MP antifraud approval is not guaranteed.

## Session 2 — checkout submit UX + prop-drilling refactor

Scope: `apps/web/src/components/domains/billing/billing-sheet.tsx` **only**
(`payment-brick.tsx` untouched). Three user asks, in order: (a) the UI "stalls" between
pressing pay and the result/error — show a loading status that replaces the brick until the
response; (b) use semantic HTML, fewer `div`s; (c) remove prop drilling, **no `useContext`**.

### What changed

- **`useRefreshBilling()` hook** (new, module-scope) wraps the two
  `queryClient.invalidateQueries` calls (`billing.getSnapshot` + `viewer.usage`). Used by both
  the checkout mutations and `cancelSubscription` — no `queryClient`/`refreshBilling` threading.
- **`PlanCheckout` is now self-contained.** It owns the `createSubscription` / `changePlan`
  mutations and the submit handler (moved out of `BillingSheetContent`), reads
  `authClient.useSession()` locally, and renders its own checkout-error `Alert`. Props shrank
  from `{ onTokenReady, payerEmail, planId }` to `{ onCompleted, planId, snapshot }` — all
  consumed locally; `onCompleted` is the one callback the parent legitimately owns (navigate
  back to overview on success). The Session 1 `deviceId` forwarding
  (`window.MP_DEVICE_SESSION_ID` → `mutateAsync`) moved here intact as `submit` —
  `submitCheckout` no longer exists in `BillingSheetContent`.
- **In-flight loading status.** `processing = createSubscription.isPending ||
  changePlan.isPending`. While true, an opaque `bg-background` overlay (`absolute inset-0`,
  `role="status"`, soft fade-in) covers the brick with a `DashRing` spinner +
  "Procesando tu pago / Estamos validando tu tarjeta con Mercado Pago. No cierres esta ventana."
  Deliberately an **overlay, not an unmount**: the MP `<Payment>` brick stays mounted so the
  typed card survives a decline (retry without re-entry) and the SDK iframe is not
  re-initialized. On decline, `mutateAsync` rejects → the throw propagates to the brick's
  `onSubmit` (brick exits its own loading) while `onError` shows the inline alert; `isPending`
  flips false → overlay clears, brick returns.
- **Semantic markup.** Checkout view: root `div`→`section`, order-summary `div`→`article`,
  price `div`→`p`, security-note `div`+`span`→a single `<footer>` (text inline), overlay text
  `div`+`p`+`p`→one `<p>` with two `<span>`s.
- **`BillingSheetContent` slimmed.** No longer holds `session`, `queryClient`,
  `checkoutError`/`showCheckoutError`, the checkout mutations, or `submitCheckout`. `goBack` /
  `onSelectPlan` no longer clear a parent error (unmounting `PlanCheckout` discards its own).

### De-drilling result

Checkout render went from
`<PlanCheckout onTokenReady={submitCheckout} payerEmail={session?.user.email} planId=… />`
(two props re-forwarded again into `PaymentBrick`) to
`<PlanCheckout onCompleted={…} planId={view.planId} snapshot={snapshot} />`. `PaymentBrick`'s
`payerEmail` is now a single parent→consumer hop from `PlanCheckout`'s local session read, not a
chain from `BillingSheetContent`. `snapshot` stays a prop (consumed for `isFree`), consistent
with `PlanOverview` / `PlanSelector`.

### Session 2 verification

- LSP diagnostics OK; `pnpm dlx ultracite fix` clean (only class-order / format changes).
- Submit / rethrow + in-flight toggle semantics validated in a JS REPL replica (no tests added).
- NOT verified in-browser (still cannot reproduce a real MP decline locally). On a real attempt
  confirm: overlay appears on submit and clears on settle, and the card form survives a decline
  for retry.

## Next steps

1. User to retry the real-card flow in-browser. With the passthrough fix, any remaining failure
   shows MP's real message inline (not a 500) — capture it. Also confirm the new in-flight
   overlay appears while the request is pending and clears on success/decline.
2. If still `CC_VAL_433`: raise the MP plan `transaction_amount` above the micro-charge floor
   (~5–10 PEN) and/or try a different card/bank.
3. Confirm `window.MP_DEVICE_SESSION_ID` is actually populated at submit time (DevTools console)
   — if empty, the header isn't being sent and the device-id script load needs investigating.
4. Do not add tests; do not read `.env`; do not introduce `useContext`; avoid prop drilling
   (local reads over new props) and prefer semantic HTML.
