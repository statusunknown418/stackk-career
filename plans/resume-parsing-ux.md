# Resume Create Flow: Dialog + Optional PDF Parse + Durable Progress UX

## Goal

Replace the bare "Crear nuevo" mutation in `apps/web/src/routes/_protected/dash/resumes/index.tsx` with a dialog-driven flow that:

1. Collects a required **label** (resume name).
2. Optionally accepts a **PDF** for AI parsing via existing `Dropzone` + `resumeUploader`.
3. No PDF → creates a blank resume immediately, navigates to the editor.
4. With PDF → triggers `agents.triggerK02ParseResume`, shows durable progress, auto-navigates to the new resume on completion.
5. Survives dialog close, page refresh, and concurrent imports.

Optimize for: **performance**, **maintainability**, **scalability**. All schemas live in `packages/schemas/src/...`.

---

## Architecture Principles

- **Single source of truth for progress**: Trigger.dev realtime feed, subscribed by tag. No parallel local optimistic store.
- **Schemas are centralized**: every Zod schema added by this work lives under `packages/schemas/src/{api,jobs}/...`. Never inline in routes/handlers.
- **No backwards-compat shims**: extend `resumes.create` input to require `label` (breaking change is fine — DB resettable).
- **Pure mappers** for UI state derivation (testable, no React).
- **No premature extraction**: split files only where there are two distinct concerns (form vs. progress vs. pending list).
- **No custom hook wrappers around existing primitives.** If TanStack Query (`useQuery`, `useMutation`, `useSuspenseQuery`, `queryClient.invalidateQueries`) or Trigger React (`useRealtimeRun`, `useRealtimeRunsWithTag`, `useRealtimeRunWithStreams`) already covers the need, call it inline at the component. Wrap **only** when adding non-trivial logic (derived state, multiple primitives composed, complex memoization) that would otherwise duplicate across components.

---

## State Model

### Search params (route-controlled, durable across refresh)

```
/dash/resumes?create=1&parserRunId=run_xxx
```

| Param | Meaning |
|---|---|
| `create=1` | Dialog is open. Absent → closed. |
| `parserRunId` | Active import. Presence → "import" mode; absence → blank form. |

**Dropped from original draft**: `createMode`, `parserFileId`, `parserLabel`.
- `createMode` is derivable from `parserRunId`.
- `parserFileId` is redundant — `runId` is the canonical pointer.
- `parserLabel` would leak PII into browser history, Sentry breadcrumbs, server logs. Carry the label as Trigger run metadata instead (`metadata.set("displayName", payload.displayName)`); realtime feed restores it on refresh.

### Trigger run metadata (single source of progress)

Already emitted by `packages/jobs/src/trigger/tasks/resume-parser.ts`:

- `step`: `resolving_file | running_agent | creating_records | inserting_blocks | complete`
- `phase.<kind>`: `validation | header | entries | skills | ...` × status
- `events[]`: append-only stream

Add:

- `metadata.set("displayName", payload.displayName)` at task start so reopening the dialog can show the label.
- Task return value typed via new output schema → exposes `resumeId` to realtime consumers.

---

## Public API / Schema Changes

All schemas live in `packages/schemas/src/...`.

### `packages/schemas/src/api/resumes.ts`

```ts
export const createResumeInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
});
export type CreateResumeInput = z.infer<typeof createResumeInputSchema>;
```

### `packages/schemas/src/api/agents.ts`

- Tighten `triggerResumeParserInputSchema.displayName` to `.trim().min(1).max(120)`.
- No new realtime-token procedure (see realtime section below).

### `packages/schemas/src/api/realtime.ts` (new, shared)

```ts
export const realtimeTokenSchema = z.object({
  token: z.string(),
  expiresAtMs: z.number().int(),
});
export type RealtimeToken = z.infer<typeof realtimeTokenSchema>;
```

Replaces ad-hoc `coachingRealtimeTokenSchema`. Coaching imports from here.

### `packages/schemas/src/jobs/resume-parser.ts`

```ts
export const resumeParserOutputSchema = z.object({
  resumeId: z.string(),
  generationId: z.string(),
});
export type ResumeParserOutput = z.infer<typeof resumeParserOutputSchema>;

export const resumeParserPhaseKindSchema = z.enum([
  "validation",
  "header",
  "entries",
  "skills",
  // keep in sync with ResumeParserEvent.kind in the agent handler
]);

export const resumeParserPhaseStatusSchema = z.enum(["pending", "running", "success", "failed"]);

export const resumeParserStepSchema = z.enum([
  "resolving_file",
  "running_agent",
  "creating_records",
  "inserting_blocks",
  "complete",
]);
```

UI consumes these — no parallel client-side type drift.

### `packages/api/src/routers/resumes.ts`

- `create` procedure: add `.input(createResumeInputSchema)`.
- Use `input.label` as both `title` and `displayName`. Drop the date-stamp fallback when a label is present.

### `packages/api/src/routers/agents.ts`

- Keep `triggerK02ParseResume` as-is (tags already correct: `user:${userId}`, `file:${fileId}`, `agent:resume-parser`).
- **No** new `resumeParserRealtimeToken` procedure.

### Realtime token: reuse, don't duplicate

`coaching.realtimeToken` already mints a token scoped to `tags: ['user:${userId}']` — exactly the scope the parser tags include. Rather than fan out per-feature tokens:

- Move it to a shared location. Options (pick one in implementation):
  - Promote to `viewer.realtimeToken` on a viewer/user router.
  - Re-export from `agents.realtimeToken` and have coaching alias it.
- Output schema becomes the shared `realtimeTokenSchema`.

This unifies all user-scoped realtime auth (parser, k02 analysis, coaching) under one procedure.

### Naming cleanup (`triggerK02FastAnalysis` vs `initiateResumeAnalysis`)

**Defer to a separate PR.** Mixing a rename with a new feature hurts diff hygiene and revertability. Not in scope here.

### Parser task changes (`packages/jobs/src/trigger/tasks/resume-parser.ts`)

- At task start: `metadata.set("displayName", payload.displayName ?? null)`.
- Type the task return with `resumeParserOutputSchema`:
  ```ts
  return resumeParserOutputSchema.parse({
    resumeId: createdResume.id,
    generationId: createdGeneration.id,
  });
  ```
- Web reads `run.output.resumeId` directly from realtime — no list refetch race, no "match newest AI draft" guesswork.

---

## UI Composition

### File layout

```
apps/web/src/components/domains/resumes/
  resume-create-dialog.tsx         # dialog shell + search-param plumbing
  resume-create-form.tsx           # label + Dropzone, react-hook-form
  resume-import-progress.tsx       # calls useRealtimeRun(parserRunId) inline
  resume-pending-cards.tsx         # calls useRealtimeRunsWithTag inline, renders cards
  lib/
    map-parser-phase.ts            # pure: Trigger metadata → PhaseUi
```

**No custom hooks.** Trigger React already exposes `useRealtimeRun` and `useRealtimeRunsWithTag`; TanStack provides `useMutation`/`useQuery`. Call them at the component that owns the rendering. The only extracted unit is `map-parser-phase.ts` — a pure function, not a hook.

Route file stays thin: render list + `<ResumePendingCards />` + `<ResumeCreateDialog />`. No upload/trigger/realtime/nav logic in the route.

### Dialog states (derived, not stored)

| State | Trigger source |
|---|---|
| `idle` | No `parserRunId` in URL, form clean |
| `uploading` | Local: PDF upload in-flight |
| `triggering` | Local: `triggerK02ParseResume` mutation pending |
| `parsing` | `parserRunId` present, run status ∈ `QUEUED \| EXECUTING` |
| `failed_recoverable` | run status `FAILED` |
| `failed_terminal` | run status `CANCELED` (validation gate aborted) |
| `success` | run status `COMPLETED` with `output.resumeId` |

Form fields:
- Required text input for `label` (Zod-validated via `createResumeInputSchema`).
- Optional `Dropzone` with `resumeUploader`.
- Submit disabled while `uploading | triggering`.

### Closing the dialog mid-parse

- Background task continues (Trigger-side).
- `parserRunId` stays in URL → reopening restores progress view.
- Grid renders a **pending card** for the run (see "Pending cards" below).

### Pending cards — single derivation, no dual store

Call `useRealtimeRunsWithTag` directly inside `resume-pending-cards.tsx`. No wrapper hook.

```tsx
const { runs } = useRealtimeRunsWithTag<typeof resumeParserTask>(`user:${userId}`, { accessToken });
const pending = runs
  .filter(r => r.tags.includes("agent:resume-parser"))
  .filter(r => r.status === "QUEUED" || r.status === "EXECUTING")
  .map(r => ({
    id: r.id,
    label: r.metadata?.displayName ?? "CV importado",
    phase: mapParserPhase(r.metadata),
  }))
```

Grid merges `resumes.list ⊕ pendingRuns`, deduped by `output.resumeId` once it appears. No local optimistic state machine. Pending card disappears naturally when the run completes and the list invalidates.

Bonus: handles refresh, concurrent imports, and dialog-close recovery without explicit code paths.

### Completion behavior

On run `COMPLETED`:

1. Read `run.output.resumeId` from realtime payload.
2. `queryClient.invalidateQueries({ queryKey: orpc.resumes.list.queryKey() })`.
3. `navigate({ to: "/dash/resumes/$resumeId", params: { resumeId: run.output.resumeId } })`.
4. Clear `parserRunId` from URL.

No fallback list-scanning. If `output.resumeId` is missing → bug, surface explicitly.

### Failure UX

- **Terminal** (validation gate, `AbortTaskRunError "Not a resume:"`):
  - Map to status `CANCELED`.
  - Copy: *"No pudimos detectar un CV en este PDF."* + show `validation.reason` if present in metadata.
  - Action: "Subir otro archivo" — resets form, keeps label.
- **Recoverable** (`FAILED`):
  - Copy: *"Algo falló al procesar. Intenta nuevamente."*
  - Action: "Reintentar" → re-trigger with fresh idempotency seed, same `fileId` + label.

---

## Performance

- **No polling.** Use `useRealtimeRunsWithTag` for the pending grid and `useRealtimeRun(parserRunId)` for the dialog. Tag subscription survives refresh without storing runId.
- **Token TTL caching.** Token query uses React Query `staleTime = TTL - 60s`. Don't refetch on every phase update.
- **Prefetch token on dialog open**, not on submit — overlaps with the PDF upload network latency.
- **Invalidate `resumes.list` only on completion**, not on every phase event. Realtime drives UI; DB hit happens once.
- Parser internal parallelism (9 section extractions) is already in place — no web-side change.

---

## Maintainability

- Schemas centralized → one place to evolve types.
- Pure phase mapper (`map-parser-phase.ts`) → unit-testable golden-table tests, no React.
- No custom hooks. Components call Trigger React (`useRealtimeRun`, `useRealtimeRunsWithTag`) and TanStack Query (`useMutation`, `useQuery`, `useSuspenseQuery`) primitives directly.
- Dialog/form/progress split → swap or extend without touching route.
- No `className` constants; keep Tailwind inline per project convention.
- All async errors via `log.error(toError(err))`.
- `Promise.allSettled` for any fan-outs (not `Promise.all`).

---

## Scalability

- Tag-scoped subscription handles **N concurrent imports** with the same UI surface (one card per run).
- Parser already idempotent (`idempotencyKey = parser-${userId}-${idempotencySeed}`, 24h TTL).
- Per-user `concurrencyKey: userId` already on the queue → no DoS from one user.
- This orchestration pattern (dialog → upload → trigger → tag subscription → auto-nav) is reusable for future long-running flows (cover-letter generation, bulk imports, etc.). The split files become the template.

---

## Test Plan

### Unit (pure functions)

- `map-parser-phase`: golden table of metadata snapshots → expected `PhaseUi`. Covers all `step` values, `phase.*` statuses, mixed/missing fields.
- `createResumeInputSchema`: trim, min/max length, unicode boundaries.

### Web component

- Dialog opens via search param, closes cleanly, persists across navigation.
- Blank flow: submits `{ label }`, calls `resumes.create`, navigates to editor.
- Import flow: waits for upload to resolve **before** calling `triggerK02ParseResume`.
- Closing dialog during parse: `parserRunId` stays in URL, pending card renders in grid.
- Reopening with `parserRunId` in URL: progress view restored from realtime alone (no local state needed).
- Two concurrent imports: two cards; completion of one does not drop the other.
- Completion: pending card removed, list invalidated, navigation fires once.
- Terminal failure (`CANCELED`): shows non-retryable copy with `validation.reason`.
- Recoverable failure (`FAILED`): retry button re-triggers with fresh idempotency seed.

### API

- `resumes.create` rejects missing/empty/oversized label.
- `resumes.create` stores `label` as both `title` and `displayName`.
- `triggerK02ParseResume` rejects missing or foreign `fileId` (ownership check).
- Shared realtime-token procedure: token scoped to `user:${userId}` tags only.

### Integration

- Upload PDF → trigger parser → realtime metadata updates → list invalidates → editor opens.
- Invalid PDF → validation abort → terminal error state → no phantom resume row in DB.
- Refresh mid-parse → cold start with `parserRunId` in URL → progress fully recovered from realtime.

---

## Out of Scope

- Renaming `triggerK02FastAnalysis` / `initiateResumeAnalysis` for consistency — separate PR.
- Server-side polling fallbacks — realtime is the contract.
- Resume parsing for non-PDF inputs.
- Editing the parser agent itself.

---

## Implementation Order

1. **Schemas** in `packages/schemas/src/{api,jobs}/...` (resumes input, parser output, parser phase, shared realtime token).
2. **Parser task**: set `displayName` metadata, return typed output.
3. **API**: `resumes.create` takes `label`; promote/share realtime-token procedure.
4. **Pure helper**: `map-parser-phase.ts` (no hook).
5. **Web components**: `resume-create-form`, `resume-import-progress`, `resume-pending-cards`, `resume-create-dialog` — each calls Trigger React / TanStack primitives inline.
6. **Route integration**: wire dialog into resumes index, remove old direct-create button.
7. **Tests**: mapper goldens, schema validation, integration smoke.

---

## Step-by-Step Actions

Concrete checklist. Each step lists touched files, what changes, what to verify before moving on.

### Step 1 — Schemas (foundation, blocks everything)

**1.1** `packages/schemas/src/api/resumes.ts`
- Add `createResumeInputSchema = z.object({ label: z.string().trim().min(1).max(120) })`.
- Export `CreateResumeInput` type.

**1.2** `packages/schemas/src/api/agents.ts`
- Tighten `triggerResumeParserInputSchema.displayName` → `.string().trim().min(1).max(120).optional()`.

**1.3** `packages/schemas/src/api/realtime.ts` (new file)
- `realtimeTokenSchema = z.object({ token: z.string().min(1), expiresAtMs: z.number().int().positive() })`.
- Export `RealtimeToken` type.

**1.4** `packages/schemas/src/api/coaching.ts`
- Replace local `coachingRealtimeTokenSchema` with re-export from `./realtime`. Keep `CoachingRealtimeToken` type alias pointing to `RealtimeToken` to avoid wide ripple, OR rename consumers — pick rename since no backwards-compat constraint.

**1.5** `packages/schemas/src/jobs/resume-parser.ts`
- Add `resumeParserOutputSchema`:
  ```ts
  export const resumeParserOutputSchema = z.object({
    resumeId: z.string(),
    generationId: z.string(),
    fileId: z.string().nullable(),
    objectType: z.string(),
    validation: resumeValidationSchema,
  });
  ```
  Keep all current return fields — UI primary reads `resumeId`, but downstream consumers (analytics, retry flows, debugging) may want `fileId`/`objectType`/`validation`.
- Add `resumeParserStepSchema`, `resumeParserPhaseStatusSchema`, `resumeParserPhaseKindSchema` (enum values must match `ResumeParserEvent.kind` in `packages/jobs/src/agents/resume-parser.handler.ts` — cross-check before committing).
- Export inferred types.

**Verify**: `pnpm --filter @stackk-career/schemas typecheck` (or root `pnpm -r typecheck`) green.

### Step 2 — Parser task (return typed output + metadata)

**2.1** `packages/jobs/src/trigger/tasks/resume-parser.ts` (task already exists — modify only)
- Right after `logger.info("resume-parser = start", …)`, add `metadata.set("displayName", payload.displayName ?? null)`.
- Wrap existing return in `resumeParserOutputSchema.parse(...)` — keep all current fields:
  ```ts
  return resumeParserOutputSchema.parse({
    resumeId: createdResume.id,
    generationId: createdGeneration.id,
    fileId: resolved.fileId,
    objectType: RESUME_PARSER_OBJECT_TYPE,
    validation: agentOutput.validation,
  });
  ```
  Schema enforces shape; runtime parse fails fast if drift.

**Verify**: `grep -rn "resumeParserTask" packages apps` — every consumer compiles. `pnpm --filter @stackk-career/jobs typecheck`.

### Step 3 — API procedures

**3.1** `packages/api/src/routers/resumes.ts`
- Import `createResumeInputSchema` from `@stackk-career/schemas/api/resumes`.
- `create` procedure: chain `.input(createResumeInputSchema)` before `.handler`.
- In handler: destructure `input.label`. Use as both `title` and `displayName` on the `resumes` insert (drop the `Nuevo CV - ${formatDate(...)}` fallback; `label` is required).
- Remove unused `constructNow`/`formatDate` import if no other usage.

**3.2** Shared realtime token — pick path A (simpler):
- Create `packages/api/src/routers/viewer.ts`-level `realtimeToken` procedure (or add to existing `viewer` router — file exists). Output `realtimeTokenSchema`. Body identical to current `coaching.realtimeToken`.
- Delete `coaching.realtimeToken` handler; update consumers (`apps/web/src/components/domains/coaching/*`) to call `orpc.viewer.realtimeToken.queryOptions()`.
- Confirm router index re-exports.

**3.3** `packages/api/src/routers/agents.ts` — no functional change. (Tags already correct.)

**Verify**: `pnpm --filter @stackk-career/api typecheck`. `pnpm --filter web typecheck` — old `coachingRealtimeTokenSchema` references should fail-fast.

### Step 4 — Pure phase mapper

**4.1** `apps/web/src/components/domains/resumes/lib/map-parser-phase.ts` (new)
- Signature: `mapParserPhase(metadata: Record<string, unknown> | undefined | null): PhaseUi`.
- `PhaseUi` shape: `{ step: ResumeParserStep, label: string, progress: 0..1, validationReason: string | null, displayName: string | null }`.
- Pure. No React. No imports from `@trigger.dev/*`.
- Read `metadata.step`, `metadata["phase.<kind>"]`, `metadata.displayName`, `metadata.events`.
- Co-locate small unit test `map-parser-phase.test.ts` (golden table of metadata snapshots → expected `PhaseUi`).

**Verify**: `pnpm --filter web test map-parser-phase`.

### Step 5 — Web components (split files, no custom hooks)

**5.1** `apps/web/src/components/domains/resumes/resume-create-form.tsx`
- react-hook-form + `zodResolver(createResumeInputSchema)`.
- Required label `<Input>`.
- Optional `<Dropzone<{ generationId?: string }> endpoint="resumeUploader" />` — onClientUploadComplete returns `storedId`, hand back to dialog via `onUploaded({ fileId, label })`.
- Submit button: `Disabled` while uploading or while parent indicates `triggering`.
- Two callbacks exposed: `onCreateBlank({ label })`, `onParse({ label, fileId })`. Form does not call mutations itself.

**5.2** `apps/web/src/components/domains/resumes/resume-import-progress.tsx`
- Props: `parserRunId: string`, `accessToken: string`, `onComplete(resumeId: string): void`, `onClose(): void`.
- Body: `const { run } = useRealtimeRun<typeof resumeParserTask>(parserRunId, { accessToken });`
- `const phase = mapParserPhase(run?.metadata);`
- Render label, step copy, progress bar, validation reason.
- On `run?.status === "COMPLETED"` and `run.output?.resumeId` → call `onComplete(run.output.resumeId)`.
- On `run?.status === "CANCELED"` → terminal copy + "Subir otro archivo" action (resets via parent).
- On `run?.status === "FAILED"` → recoverable copy + retry action.

**5.3** `apps/web/src/components/domains/resumes/resume-pending-cards.tsx`
- Props: `userId: string`, `accessToken: string`.
- `const { runs } = useRealtimeRunsWithTag<typeof resumeParserTask>(\`user:\${userId}\`, { accessToken });`
- Filter `tags.includes("agent:resume-parser")` + status QUEUED/EXECUTING.
- Render `<ResumeCard>`-shaped skeletons with `phase.label`.
- On completion, invalidate `orpc.resumes.list.queryKey()` (debounce via effect on `runs.some(r => r.status === "COMPLETED")`).

**5.4** `apps/web/src/components/domains/resumes/resume-create-dialog.tsx`
- Reads `create`, `parserRunId` from route search.
- `useQuery(orpc.viewer.realtimeToken.queryOptions({ staleTime: 29 * 60 * 1000 }))` — prefetched on dialog open.
- `useMutation(orpc.resumes.create.mutationOptions(...))` for blank path.
- `useMutation(orpc.agents.triggerK02ParseResume.mutationOptions(...))` for parse path. On success → `navigate({ search: { create: 1, parserRunId: handle.runId }})`.
- Renders `<ResumeCreateForm>` when no `parserRunId`, else `<ResumeImportProgress>`.
- onComplete from progress → invalidate list, navigate to editor, clear `parserRunId` + `create`.

**Verify**: dev server, manual smoke (open dialog, blank flow, PDF flow, close-mid-parse, refresh-mid-parse).

### Step 6 — Route integration

**6.1** `apps/web/src/routes/_protected/dash/resumes/index.tsx`
- Add `validateSearch` for `{ create?: 1, parserRunId?: string }`.
- Delete inline `useMutation(orpc.resumes.create.mutationOptions(...))` and direct `mutateAsync({})` calls.
- Replace "Crear nuevo" button → opens dialog via `navigate({ search: prev => ({ ...prev, create: 1 })})`.
- Render `<ResumePendingCards>` above/alongside list grid.
- Render `<ResumeCreateDialog>` mounted at route level.

**Verify**: empty state still works; existing data renders; Meter still shows count; cap at 5 still enforced.

### Step 7 — Tests

**7.1** Mapper goldens — covered in 4.1.
**7.2** `createResumeInputSchema` validation tests (trim, min/max, unicode).
**7.3** API: `resumes.create` rejects empty/oversized label (add to existing router test file if present, else inline minimal test).
**7.4** Web: `resume-create-dialog.test.tsx` — open/close via search param, blank submit, parse path triggers in correct order, pending card persists across dialog close.

**Verify**: `pnpm test` green.

### Step 8 — Cleanup pass

- Grep for `coachingRealtimeTokenSchema` — must be zero hits.
- Grep for stale `mutateAsync({})` in route — must be zero.
- Grep for inline `Nuevo CV - ${formatDate` — must be zero.
- Confirm no new custom hook files (`use-*.ts`) exist in `apps/web/src/components/domains/resumes/`.
- Run `pnpm dlx ultracite fix` before commit.

### Step 9 — Commit slicing (separate PRs for easier review)

1. **PR-1**: schemas + parser task output (steps 1–2). Backend-only, no UI.
2. **PR-2**: `resumes.create` label requirement + shared realtime token (step 3).
3. **PR-3**: web flow — mapper, components, dialog, route wiring, tests (steps 4–7).

Each PR is independently revertable. PR-1 + PR-2 ship behind feature absence (UI doesn't call them yet beyond existing onboarding-chat path).
