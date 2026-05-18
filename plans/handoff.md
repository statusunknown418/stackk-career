# Resume Editor Refactor — Handoff

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
