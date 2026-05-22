# Resume Editor Refactor — Handoff

## Session update (2026-05-21 — scalability pass)

### Queues split per task (#1)
- `packages/jobs/src/trigger/queues.ts` — replaced single `agentQueue` with:
  - `resumeParserQueue` (default 5, env `RESUME_PARSER_QUEUE_CONCURRENCY`)
  - `k02Queue` (default 10, env `K02_QUEUE_CONCURRENCY`)
- `trigger/tasks/resume-parser.ts` + `trigger/tasks/k02-fast-analysis.ts` wired to new queues.
- `src/index.ts` exports `k02Queue` + `resumeParserQueue` (was `agentQueue`).
- `k02FastAnalysisTask` triggers already pass `concurrencyKey: userId` (`packages/api/src/routers/agents.ts:94`) → per-user fairness within queue cap.

### LLM call bundling — 10 → 4 calls (#2)
- `packages/schemas/src/jobs/resume-parser.ts` — added bundle schemas:
  - `extractedHeaderSchema` ({ contact, summary }) — each nullable
  - `extractedEntriesBundleSchema` ({ experience, education, certifications, projects, volunteering }) — each nullable
  - `extractedSkillsBundleSchema` ({ skills, languages }) — each nullable
- `packages/jobs/src/agents/resume-parser.handler.ts` — 4 LLM calls instead of 10:
  1. validation gate
  2. header bundle (contact + summary)
  3. entries bundle (5 entries-shaped sections in one call)
  4. skills bundle (2 skills-shaped sections in one call)
- Return shape unchanged → `planSections` + `insert-blocks` untouched (per-kind fields populated from unpacked bundles).
- ~60% LLM gateway call reduction per resume. Cuts plan compute-seconds + gateway quota usage.
- Gateway tags added (`feature:resume-parser`, `env:*`) on every call for per-user spend tracking.

### Per-call LLM timeouts (#3)
- `AbortSignal.any([outer, AbortSignal.timeout(ms)])` wraps every `generateText` / `streamText` so one stuck call can't hold the run open for the full `maxDuration`.
- Parser: `VALIDATION_TIMEOUT_MS = 30 * 1000` (30s), `BUNDLE_TIMEOUT_MS = 4 * 60 * 1000` (4 min). Envs: `RESUME_PARSER_VALIDATION_TIMEOUT_MS`, `RESUME_PARSER_BUNDLE_TIMEOUT_MS`.
- k02: `K02_TIMEOUT_MS = 3 * 60 * 1000` (3 min). Env: `K02_FAST_ANALYSIS_TIMEOUT_MS`. Gateway tags also added (`feature:k02-fast-analysis`).

### Scalability follow-ups still open
- **#4 onFailure parity on parser** — `resumeParserTask` still has no `onFailure` to mark user-facing row failed. Required before user-facing wiring of parser.
- **#5 DB batching** — `resumeParserTask` does 3 sequential RTTs (generation → resume → roots) then N parallel child inserts. Collapse to `db.batch(...)` for atomic 1-RTT inserts.
- **#6 `$withCache()` invalidation** on `resolveFile` and `getUserMetadata` — confirm cache eviction on file/user updates so deleted/changed rows don't resurface.
- **#7 Host check before DB write** in k02 — move `assertPdfHostAllowed` ahead of `resume_analyses` status flip to avoid churn rows on bad input.
- **#8 Suggestions persist after stream close** — `apps/web/src/routes/api/resume-suggestions.ts:65` calls `recordSuggestionCompletion` inside `onFinish`. Client disconnect mid-stream loses persistence. Move to fire-and-forget Trigger task or `waitUntil`.
- **#10 Parser idempotency** — wire `idempotencyKey` + `concurrencyKey: userId` at the future `resumeParserTask.trigger` call site (same pattern as k02 in `routers/agents.ts:85`).

### Trigger plan-limit notes
- Parser compute per run dropped ~60% (4 calls vs 10, max 4 min cap vs 600s task budget).
- Stuck calls now abort at 30s / 4 min / 3 min instead of holding their slot for the full task `maxDuration`.
- Conservative queue concurrency (parser=5, k02=10) prevents compute-second spikes.
- Raise via env when gateway + plan headroom confirmed.

---

## Session update (2026-05-21)

### Logging infra + jobs hardening

**Logging — back to official evlog/nitro/v3 primitives:**
- `apps/web/nitro.config.ts` — restored `evlog/nitro/v3` module. Removed custom plugin hack.
- `apps/web/server/plugins/evlog-drain.ts` — recreated; hooks `evlog:drain` for Axiom (per official adapter pattern).
- `apps/web/server/plugins/evlog.ts` — deleted (was reinventing the official plugin with manual `event.req.context` casts).
- `packages/api/src/logging.ts` — deleted. Replaced with: shared `@stackk-career/schemas/utils/to-error` + evlog's built-in `log` + `RequestLogger` via Nitro `useRequest()`.
- `apps/web/src/lib/request-log.ts` — reads `useRequest()?.context?.log` (the canonical path the evlog Nitro v3 plugin writes to). No globalThis hack.

**packages/jobs — security + scale fixes:**
- `lib/resume-parser/resolve-file.ts` — now requires `userId` and adds `eq(fileMetadata.userId, userId)` to the lookup. Prevents fileId enumeration / cross-user parsing of arbitrary uploads. Caller in `trigger/tasks/resume-parser.ts` passes `payload.userId`.
- `trigger/tasks/resume-parser.ts` — wraps validation-gate failures with `AbortTaskRunError`. "Not a resume" no longer retries 3× and burns LLM cost.
- `trigger/tasks/k02-fast-analysis.ts` — `onFailure` uses `toError(error).message` instead of inline ternary (respects `[[feedback_use_toerror]]`).
- `lib/ai/pdf-message.ts` — new. Single helper `pdfUserMessage(pdfUrl, ...texts)` used by both resume agents. Genuine 2-caller extraction; replaces 12 lines of duplicated `{type:"file",data:new URL(),...}` payload at each site.
- Kept `agents/{resume-parser,k02-fast-analysis}.handler.ts` suffix (clearer distinction from task wrappers). Updated importers in `trigger/tasks/*` + `lib/resume-parser/plan-sections.ts` to use `.handler` path explicitly — pre-existing typecheck failure resolved.

**Pre-existing typecheck failures NOT fixed (still pending from earlier handoff):**
- `ai-elements/*` — widespread `asChild`/`className`/`closeDelay` errors. Cosmetic library mismatch with coss/Base UI primitives. Not touched.
- `header.tsx:16` — `to: "/dashboard"` stale.
- `dash/route.tsx:63` — `to: "/dash/resumes/"` trailing slash mismatch.
- `messages.ts:36` — Drizzle `model: unknown` mismatch.
- `spinner.tsx:5` — `Loader2Icon` not imported.
- `snippet.tsx:9` — imports nonexistent `InputGroupButton`.
- `hover-card` module missing (attachments.tsx).

**Scale notes (documented, not yet implemented):**
- `agentQueue` concurrency tied to `AGENT_QUEUE_CONCURRENCY` env (default 10). Raise per load.
- Resume parser fires 9 parallel `generateText` calls per resume. At 1000 concurrent users that's 9000 in-flight gateway calls — confirm gateway quotas before launch.
- `resumeParserTask` has no `onFailure` to mark a user-facing generation row as failed. `k02-fast-analysis` does. Consider parity once generations gain a status field.
- Per-user queue would prevent one user starving the shared `ai-agents` queue. Skipped for now.

---

## Session update (2026-05-18)

### Suggestion popover polish + bug fixes

**Findings:**
- `useObject` partial-JSON parser was leaking `]}` into final suggestion's `html` field. Cause: `xai/grok-4.1-fast-non-reasoning` flaky on structured output via `streamText` + `Output.object` + `toTextStreamResponse()`. Pattern is the AI SDK v6 canonical setup (`streamObject` deprecated) — fault is the model, not the wiring.
- Original popover had visual issues: weak option separation (just `border-t`), 3-bar skeleton looked stale, no slot labels.
- After adding required `label` field to schema, render gate `!(html && label)` blocked all UI until both fields completed in partial JSON parse → looked like streaming was broken.
- Handoff Critical #1 claim ("`suggestionsRouter` never called, delete it") is **partially wrong**. File-route at `routes/api/resume-suggestions.ts` calls `client.suggestions.prepareSuggestion` and `client.suggestions.recordSuggestionCompletion` via oRPC. Only the *stream* handler inside `suggestionsRouter` (the `ReadableStream.from` one) is dead. `prepareSuggestion` + `recordSuggestionCompletion` procedures are live and required.

**Updates landed:**
- `packages/api/src/lib/resume-suggestions.ts` — prompt hardening:
  - Banned markdown code fences, demand complete 4 elements, well-formed html strings.
  - Bumped `3 suggestions` → `4 suggestions`.
  - Added AI-generated per-option `label` instructions (2–4 words, distinct, language-matched).
  - Added Spanish-specific rules (Sustantivación for bullets, no third-person past-tense, anti-Spanglish list).
  - Added guardrails block.
- `packages/schemas/src/api/suggestions.ts` — `suggestionItemSchema` now `{ label: z.string().max(40), html: z.string().max(2000) }`. Label carried end-to-end (oRPC `recordSuggestionCompletion` persists it via the JSON `object` column, no DB schema change needed).
- `apps/web/src/components/domains/resume-document/suggestion-popover.tsx`:
  - Loading header uses `Shimmer` ("Generando sugerencias") instead of pulsing icon.
  - 4-option `columns-2` masonry (break-inside-avoid) replaces single-column list.
  - Each option card: bordered, hover bg-accent + shadow lift, AI-generated label uppercase tracking-wide.
  - Per-option progressive streaming: skeleton when item undefined → Shimmer label + Classic spinner while fields stream → clickable card when both fields complete and stream done.
  - Button `disabled={!ready}` prevents apply on partial html.

**Remaining issues introduced/surfaced this session:**
1. `routes/api/resume-suggestions.ts:72` — `let suggestions: { html: string }[] = []` is now wrong; should be `{ label: string; html: string }[]`. TS will complain.
2. Handoff Critical #1 wording — update or delete depending on next agent's decision. Recommend keeping `suggestionsRouter` with `prepareSuggestion` + `recordSuggestionCompletion` + `recordSuggestionError`, deleting only the dead `streamSuggestions` handler with the `ReadableStream.from` TS error.
3. `messages.object` JSON column now carries `label`. Any downstream consumer of `objectType: "resume-suggestion"` rows needs to be aware.

**Steps forward (suggestion feature):**
1. Fix `resume-suggestions.ts:72` type to include `label`.
2. Trim `suggestionsRouter` to live procedures only — delete `streamSuggestions` handler + its TS error, keep `prepareSuggestion` / `recordSuggestionCompletion` / `recordSuggestionError`. Reword handoff Critical #1.
3. Consider model swap if `]}` parser leak persists — `xai/grok-4.1-fast-non-reasoning` weak on structured streaming; `xai/grok-4` or `openai/gpt-4.1-mini` more reliable. Prompt hardening is band-aid, not root fix.
4. Add e2e or unit test that asserts every streamed suggestion ends with a closing tag and never contains stray `]}`.
5. Telemetry: count `finishReason !== "stop"` cases — surfaces silent model truncations.

---



## Context

Big refactor on `main` (uncommitted). Old `resume-editor/editors/*` + `fields/*` + `documents/*` stack deleted. Replaced with inline editing inside `resume-document/` and new AI suggestions system.

Branch: `main`. Migration `0011_complete_mordo.sql` pending (DB can be wiped per project rules).

## What landed

### Deleted
- `apps/web/src/components/domains/resume-editor/editors/*` (bullet, contact, entry, paragraph, section, skills)
- `apps/web/src/components/domains/resume-editor/fields/*` (checkbox, month, rich-text, select, text)
- `apps/web/src/components/domains/resume-editor/{resume-document-editor,resume-rich-text-editor,resume-rich-text-field,timeline-section,block-key-registry}.tsx`
- `apps/web/src/components/domains/documents/*` (contact-header, document-empty-state, document-section, document-skills-section, entries-section, paragraph-list)
- `apps/web/src/components/ai-elements/{audio-player,open-in-chat,prompt-input}.tsx`
- `apps/web/src/routes/api/_evlog/ingest.ts`

All confirmed unreferenced — grep clean.

### New
- `apps/web/src/components/domains/resume-document/block-key-registry.ts` (byte-identical move from old location)
- `apps/web/src/components/domains/resume-document/insert-section-zone.tsx`
- `apps/web/src/components/domains/resume-document/suggestion-popover.tsx`
- `apps/web/src/routes/api/resume-suggestions.ts` (file route, AI SDK `useObject` target)
- `packages/api/src/lib/resume-suggestions.ts`
- `packages/api/src/routers/suggestions.ts` ← **dead code, see Critical #1**
- `packages/schemas/src/api/suggestions.ts`
- `packages/db/src/migrations/0011_complete_mordo.sql` + snapshot

### Modified
- `resume-document/inline-*` (contact, entry, paragraph, section, skills, text-editor) + `resume-document.tsx`
- `resume-editor/{new-section-sheet,section-rail,use-block-mutations}`
- `ai-elements/{context,inline-citation}`, `ui/{button,logo-carousel}`
- `packages/api/routers/{index,resumes}.ts`, `packages/api/lib/resume-block-starters.ts`
- `packages/db/schema/resumes.ts`, `packages/schemas/src/db/resume-blocks.ts`
- Routes: `__root.tsx`, `_protected/dash/route.tsx`, `_protected/dash/resumes/$resumeId.tsx`

## Critical issues — fix before merge

### 1. Duplicate suggestions path + TS error
**Files:** `packages/api/src/routers/suggestions.ts:17`, `packages/api/src/routers/index.ts:12,32`

- `ReadableStream.from()` not in current TS lib target → typecheck fails. Needs `es2024` lib or wrap with `new ReadableStream` from async iterable.
- Frontend (`suggestion-popover.tsx`) uses `useObject` → POSTs to `/api/resume-suggestions` (file route). oRPC `suggestionsRouter` **never called**.
- **Action:** delete `suggestionsRouter` + its registration in `routers/index.ts`, OR rewire popover through oRPC. Pick one — don't keep both.

### 2. Migration drops user FK on resumes.userId
**Files:** `packages/db/src/migrations/0011_complete_mordo.sql`, `packages/db/src/schema/resumes.ts`

- New table def keeps only `generationId` FK. `userId` no longer has FK to `user`.
- Schema + migration consistent with each other.
- **Action:** confirm with author this is intentional (likely yes, per `no-backwards-compat` memory and DB wipe stance). If yes, ignore.

### 3. Route path TS errors (pre-existing, surface now)
**Files:** `apps/web/src/routes/_protected/dash/route.tsx:68`, `header.tsx:16`

- `careerWorkspaceNavigation` items use `to: "/dash/resumes/"` with trailing slash — TS rejects against generated `routeTree.gen.ts`.
- `header.tsx:16` still references `/dashboard` (stale path).
- **Action:** fix `to` values to match generated tree. Blocks clean `tsc`.

## Warnings — pre-existing, not refactor-caused

- `packages/api/src/routers/messages.ts:36` — Drizzle insert `model: unknown` mismatch.
- `ai-elements/*` — `asChild`/`className` errors across `file-tree`, `inline-citation`, `plan`, `queue`, `snippet`, `stack-trace`, `task`, `mic-selector`, `model-selector`, `jsx-preview`. Refactor touched `inline-citation` + `queue` without fixing.
- `ai-elements/snippet.tsx` — imports nonexistent `InputGroupButton`.
- `ai-elements/spinner.tsx:5` — uses `Loader2Icon` without import.

These mask refactor regressions during typecheck. Fix in a separate pass.

## Nits

- `suggestion-popover.tsx:47` — empty `className=""` on Button. Drop.
- `inline-entry.tsx:75` — `className={"group/entry ..."}` should be plain string literal.

## Verified clean

- All deleted modules have **no remaining importers** (grep confirmed).
- `block-key-registry.ts` move is byte-identical.
- `use-block-mutations.ts` correctly rewired — only callers now are `new-section-sheet.tsx` and `inline-{entry,paragraph,section,skills}.tsx`.
- `resume-suggestions.ts` (file route) uses `Promise.allSettled` + `toError` ✓ (matches project memory).
- No oRPC `.useQuery()` misuse — all consumers use `useQuery(orpc.x.queryOptions())` pattern.
- No native `Intl.DateTimeFormat` / native Date math introduced.
- No shadcn imports introduced; coss/ui primitives used.
- `resumes.ts` router now creates `generations` row before resume — consistent with NOT NULL `generationId` FK in new migration.

## Suggested order for next agent

1. Decide oRPC vs file-route for suggestions. If file-route stays (recommended — already wired + working), delete `packages/api/src/routers/suggestions.ts` and its two references in `routers/index.ts`. Otherwise fix `ReadableStream.from` and rewire popover.
2. Fix `dash/route.tsx:68` + `header.tsx:16` route paths so `tsc` passes.
3. Confirm intent on dropped `userId` FK with author.
4. (Optional) sweep pre-existing `ai-elements/*` TS errors so typecheck is green.
5. Address nits.
6. Run `pnpm dlx ultracite fix` then `pnpm typecheck` before commit.

## Project rules to respect (from memory)

- coss/ui only, no shadcn
- No className constants — keep inline
- No tiny wrappers, no premature extraction (single-use stays inline)
- `Promise.allSettled` over `Promise.all`
- `date-fns` (+ `date-fns-tz`) for all date work
- Schemas in `packages/schemas/src/<domain>/`
- `log.error(toError(err))` — never inline ternary
- DB can be wiped — prefer notNull + breaking migrations over backfill
- oRPC: `useQuery(orpc.x.queryOptions())`, never `orpc.x.useQuery()`
- Frame: `FrameHeader`/`FrameFooter` siblings of `FramePanel` inside `Frame`
