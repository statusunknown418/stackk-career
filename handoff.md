# Resume Editor — Handoff

Branch: `feat/resume-document-editor`
Plan files:
- Session 1: `/Users/a3tech/.claude/plans/ultra-modular-mitten.md`
- Session 2: `/Users/a3tech/.claude/plans/full-mellow-pearl.md`

---

# Session 1 — UX improvements + bug fixes

## Scope

Two buckets of work landed in this session:

1. **UX improvements** to the resume editor (experience entries, skills/languages flow, month picker, new-section sheet).
2. **Bug fixes** for rapid-click crashes (bug 1) and lost keystrokes when adding new array items (bug 2).

## Decisions locked with the user

- Experience: relabel only — `entryContentSchema.subtitle` stays; UI label comes from `ENTRY_LABELS`. Added `isRemote: boolean` field.
- Languages section: flat list (no `skill_line` UI). The auto-created starter `skill_line` stays in the DB; editor renders only its `skill_item` children.
- Custom section: keep `sectionContentSchema.isCustom` for back-compat; remove only the UI affordances (sheet option + inline title edit).
- Section title: `SECTION_DEFINITIONS.experience.title` renamed `"Experiencia laboral"` → `"Experiencia profesional"` so `getSectionKind` resolves user data.
- Bug 1 fix path: serialize creates via a `Promise` chain + `isPending` UI gate. Pacer-based draft-debounce was evaluated and rejected — it does not make the code simpler (adds state to autosave), see notes at end. Switch on request.

## Files changed

### `packages/schemas/src/db/resume-blocks.ts`
- Added `isRemote: z.boolean().default(false)` to `entryContentSchema`.

### `packages/schemas/src/api/resumes.ts`
- `SECTION_DEFINITIONS.experience.title`: `"Experiencia laboral"` → `"Experiencia profesional"`.

### `packages/api/src/lib/resume-block-starters.ts`
- Default entry starter payload now includes `isRemote: false` (required by new schema).

### `apps/web/src/lib/forms/resume-form.tsx`
- Added `ResumeFormApi` — a narrow structural alias of the TanStack form's methods we mutate from outside the form owner. Listed only the field paths we actually write (`blocks[N].id|position|createdAt|updatedAt|parentBlockId`). Parameters are contravariant → wider concrete form satisfies this narrower interface.

### `apps/web/src/components/domains/resume-editor/fields/month-picker.tsx` *(new)*
- Year `<Select>` (range `now-60 … now+5`) + 4×3 grid of Spanish month buttons (`Ene…Dic`).
- Pure UI; no external deps beyond the existing `Select` primitive and `date-fns`.

### `apps/web/src/components/domains/resume-editor/fields/month-field.tsx`
- Dropped the `<Calendar>` (day-grid) usage. Now renders `<MonthPicker>` inside the same Popover shell.
- Kept parse/format helpers (`YYYY-MM`) and the "Limpiar" button.

### `apps/web/src/components/domains/resume-editor/editors/entry-editor.tsx`
- `useDeleteBlock({ form })` — passes form into the hook (delete now also keeps form values in sync).
- Added a Remoto `CheckboxField` rendered only when `sectionKind === "experience"`.
- Grid changes between `1fr_auto_1fr_1fr_auto` (experience, with Remoto) and `1fr_1fr_1fr_auto` (other kinds).

### `apps/web/src/components/domains/resume-editor/editors/skills-editor.tsx`
- `useCreateBlock({ form })` / `useDeleteBlock({ form })`.
- New `sectionKind` prop. Two branches:
  - `languages`: flat list. Uses `lines[0]` (auto starter) and renders only its `skill_item` children with `Idioma` + `Nivel`.
  - skills (`other`/`technical`/etc.): the old 2-level UI minus the `Categoría` free-text input — only the `Tipo` select remains.
- Split proficiency options:
  - languages → `basic / conversational / fluent / native`
  - skills → `beginner / intermediate / advanced / expert`
- Add buttons gated by `createBlock.isPending`.

### `apps/web/src/components/domains/resume-editor/editors/section-editor.tsx`
- `useCreateBlock({ form })`.
- Dropped the `block.content.isCustom && <title-edit field>` branch.
- Passes `sectionKind` into `<SkillsEditor>`.
- "Agregar entrada" button gated by `createBlock.isPending`.
- New entry payload includes `isRemote: false`.
- `blockIndex` prop removed (no longer used).

### `apps/web/src/components/domains/resume-editor/resume-document-editor.tsx`
- Stopped passing `blockIndex` to `<SectionEditor>` (prop dropped).

### `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx`
- Removed the "Sección personalizada" option (and the `NotePencilIcon` import).
- `handleCreateSection` always sends `isCustom: false`.
- Accepts a `form: ResumeFormApi` prop and forwards it to `useCreateBlock({ form })`.
- Add button uses `createBlock.enqueue(input)` to serialize rapid clicks.

### `apps/web/src/components/domains/resume-editor/use-block-mutations.ts` *(rewritten)*

Now the central place for create/delete with form-aware optimism.

Key changes:
- `useCreateBlock` and `useDeleteBlock` both take `{ form: ResumeFormApi }`.
- `buildOptimisticBlock` uses `generateLexoKeyBetween(before, after)` — same fn the server uses. The previous `getOptimisticTailPosition` (append-`z`) hack is gone.
- `onMutate` pushes the optimistic block to **both** the query cache and `form` (`form.pushFieldValue("blocks", optimisticBlock)`). Without the form push the new array entry has no field state and the autosave path can't see it.
- `onSuccess` swaps the optimistic id with the real id in cache and form (`setFieldValue("blocks[idx].id", real.id)`, plus `position` / `createdAt` / `updatedAt`). No `invalidateQueries` here — that's what caused the lost keystrokes.
- Sections are the one exception: server-side `create` also inserts a starter child, so `onSuccess` for `blockType === "section"` does `invalidateQueries` to pull the starter into cache.
- `onError` rolls back the cache and removes the optimistic entry from `form` via `removeFieldValue`.
- `enqueue(input)`: a `Promise`-chain wrapper around `mutateAsync` that:
  1. Awaits the previous request so each call sees the freshest cache,
  2. Recomputes `input.before` from the cache (overrides the stale closure value the caller may have captured),
  3. Dispatches to the server.
  This eliminates the duplicate-lexo-key collision under rapid clicks.
- `useDeleteBlock` now also surgically removes the affected indices from the form via `removeFieldValue`, walking from tail to head so indices stay valid.

### `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx`
- Imported `ResumeFormApi` from `@/lib/forms/resume-form`.
- Hydration effect rewritten to **surgical reconcile** instead of `form.reset(nextValues)`:
  - `removeMissingBlocks(form, keepIds)` — splice out blocks no longer in `nextValues`.
  - `patchSurvivorBlockMetadata(form, nextById)` — update `position` / `parentBlockId` / `updatedAt` for survivors without touching content.
  - Append newly-arrived blocks via `pushFieldValue("blocks", next)`.
- This preserves in-progress keystrokes when a sibling block is added or deleted. The previous `form.reset` was the actual root cause of bug 2 — every cache invalidation wiped user typing.
- Passes `form={form}` to `<NewSectionSheet>`.

## Bug story (for the record)

- **Bug 1: rapid clicks → crash.** Root cause was twofold: handlers never awaited the mutation and the `before` value was captured at click time from a stale React closure, so two near-simultaneous requests hit the server with identical `(before, after)` → identical lexo positions. Fix: serialize via `enqueue`, recompute `before` from cache at dispatch time, gate buttons with `isPending`.
- **Bug 2: typing wiped on "add new item".** Root cause was the `form.reset(nextValues)` call inside the hydration effect — every change to the query cache triggered a full reset, which dropped any field state. The optimistic id swap (`-1 → real`) also re-keyed components. Fix: surgical reconcile in the route + cache swap (instead of invalidate) in the create mutation, keeping ids and form state stable.

---

# Session 2 — Timeline sort + UI polish

## Scope

Two follow-ups on the same branch:

1. **Auto-sort entries by date** for `experience` and `education` section kinds — newest first, `isCurrent` floats to top. Other section kinds keep the existing lexorank `position` order.
2. **UI/UX polish pass** (Emil Kowalski sensibility): add/remove motion, timeline rail with per-entry dots, field/entry focus polish, new-section sheet refinement, and a clearer section header so the user always knows which section + entry they are editing.

This is a client-only change. Schemas, server routers, and lexorank storage are unchanged — `position` stays authoritative on the wire; only the **display order** branches by section kind.

## Decisions locked with user

- Sort: `isCurrent` desc → `startDate` desc → `endDate` desc (current treated as `"9999-12"`) → `position` desc as stable tiebreak.
- Date is source of truth; **no manual drag override**.
- Polish scope: add/remove motion, timeline rail, field focus, new-section sheet, section-editor clarity.
- Out of scope: shared `components/ui/sheet.tsx` motion change (skipped per user).
- **No `Button` className overrides.** Mid-session correction — any positioning / press / pressed-state styling lives on a wrapping element instead.

## Files changed

### `packages/schemas/src/db/resume-blocks.ts`
- Added `sortEntriesByTimeline<T extends { content: unknown; position: string }>(entries)`.
- Sort order: `isCurrent` desc → `startDate` desc → `endDate` desc (current row's end treated as `"9999-12"`) → `position` desc as stable tiebreak.
- `YYYY-MM` is zero-padded so plain lexicographic compare is correct (no `Date` parsing needed). Malformed `entry.content` falls to the bottom via `entryContentSchema.safeParse`.

### `apps/web/src/index.css`
- Added two reusable easing tokens inside the existing `@theme inline` block:
  - `--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);`
  - `--ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);`
- Tailwind v4 exposes them as `ease-out-quint` / `ease-in-out-quart` utilities.

### `apps/web/src/components/domains/resume-editor/section-icons.ts` *(new)*
- Extracts the kind → icon map (`BriefcaseIcon`, `GraduationCapIcon`, etc.) so both `NewSectionSheet` and `SectionEditor` can render the same icon for a given section kind.
- Exports `SECTION_ICONS` (record keyed on defined kinds) and `getSectionIcon(kind)` (returns `null` for `"custom"`).

### `apps/web/src/components/domains/resume-editor/timeline-section.tsx`
- New optional props: `icon?: ComponentType<{ className?: string }> | null`, `entryCount?: number`, `entryNoun?: { singular: string; plural: string }`.
- Header restyled: kind icon left, `text-sm font-medium text-foreground` title (no more uppercase muted), pluralized count badge ("3 entradas" / "1 entrada"), AI/Edit action buttons fade in on hover (transition tightened to `duration-150`).

### `apps/web/src/components/domains/resume-editor/editors/section-editor.tsx`
- Imports `motion`, `AnimatePresence`, `useReducedMotion` from `motion/react` (already a dep, already used in `resume-rich-text-editor.tsx`).
- Branches sort by `sectionKind`:
  - `"experience" | "education"` → `sortEntriesByTimeline(rawEntries)`.
  - Anything else → existing `sortLexoPositions(rawEntries, …)`.
- Wraps each entry in `<motion.div key={entry.id} layout="position" initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4,transition:{duration:0.12}}} transition={…}>` inside `<AnimatePresence mode="popLayout">`. `layout="position"` (not `layout`) so reorder animates translation only — sibling height changes from rich-text editors don't trigger neighbor animations.
- `useReducedMotion()` collapses transition to `{ duration: 0 }`.
- New `focusedEntryId: number | null` state. After `createBlock.enqueue(...)` resolves, sets the state to the new block id; this propagates to the matching `EntryEditor` as `shouldAutoFocus`.
- Computes `entryCount` and a per-kind `entryNoun` (singular/plural) and threads them into `<TimelineSection>` along with the kind icon.
- Removed the section-level rail wrapper (`<div className="relative pl-4">` + absolute `<span>` line). Per-entry rail segments now compose the rail (see `entry-editor.tsx` below).

### `apps/web/src/components/domains/resume-editor/editors/entry-editor.tsx`
- New prop `shouldAutoFocus: boolean`. When `true`, an effect scrolls the root into view and focuses the first non-checkbox input. Cleared by the parent after the swap.
- Root element changed from `<li>` to `<div>` — necessary because `<motion.div>` lives between the entries container and the entry, and `<ul><motion.div><li>` is not valid HTML.
- Entry layout now:
  - Root `<div>`: `group relative -mx-3 rounded-md transition-colors focus-within:bg-muted/30 [@media(hover:hover)]:hover:bg-muted/20`. `-mx-3` lets the focus-within highlight extend to the section gutter.
  - Trash `<Button>` is now wrapped in a positioning `<div>` (`absolute -top-2 -right-2 opacity-0 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100`). **The Button itself carries no className**.
  - Content area is a flex row (`flex gap-3 px-3 py-3`). For timeline kinds, a fixed-width left gutter (`w-2 flex-none relative`) holds:
    - the vertical rail segment: `absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/60`,
    - the dot: `absolute top-5 left-1/2 size-2 -translate-x-1/2 rounded-full border border-muted-foreground/40 bg-background`, with `group-data-[current]:border-foreground group-data-[current]:bg-foreground` for `isCurrent` and `group-focus-within:border-primary group-focus-within:bg-primary` for the active row.
  - Both rail line and dot use `left-1/2 -translate-x-1/2` inside the same `w-2` column, so they self-align with no pixel math. Per-entry rail segments touch top/bottom of each entry — stacked entries produce one continuous rail.
- `data-current={isCurrent ? "" : undefined}` on the root drives the dot fill state.
- Trash button hover gating now respects touch devices via `[@media(hover:hover)]:group-hover:opacity-100`. Focus-within still surfaces it on every device.

### `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx`
- Uses the shared `SECTION_ICONS` from `section-icons.ts` (no more local map).
- Disabled (already-used) options:
  - `opacity-50` → `opacity-60` (less aggressive dimming).
  - Silent `CheckCircleIcon` replaced by a small "Ya agregada" `<Badge>` inside `ItemActions` — explicit > implicit.
- Enabled items get a quiet press feedback: `transition-transform active:scale-[0.99]`.

### `apps/web/src/components/domains/resume-editor/fields/month-field.tsx`
- The display label inside the trigger button is now wrapped in a `<span className="capitalize">`. The Button itself has **no** className. (Earlier this session the trigger briefly carried `className="capitalize transition-transform data-pressed:scale-[0.97]"`; reverted after the user flagged it — no Button className overrides anywhere in this editor.)

## Design references applied

- Custom easings (no `ease-in` for UI; ease-out for entry, ease-in-out for movement).
- Never animate from `scale(0)` — enter starts at `y:-4 opacity:0`, not `scale(0)`.
- CSS transitions for the always-on bits (focus rings, hover bg, opacity reveal of action buttons) — keyframe-free, interruptible.
- `motion`'s `layout="position"` for date-driven reorders (handles FLIP automatically).
- Hover affordances gated behind `@media (hover: hover)` so touch devices don't trigger false hover states.
- `useReducedMotion()` respects `prefers-reduced-motion`.

## Verification status

- `pnpm dlx ultracite check apps/web/src/components/domains/resume-editor` — clean for all files I authored / edited.
- `pnpm exec tsc --noEmit` (from `apps/web`) — zero new errors in `resume-editor` / `resume-blocks` / `month-field` / `section-icons`. The pre-existing pile in `ai-elements/*`, `dashboard/career-workspace-navigation.ts`, `header.tsx`, `ui/hero-dithering.tsx`, `ui/logo-carousel.tsx`, `ui/spinner.tsx`, and `packages/api/src/routers/messages.ts` is unchanged.
- One nearby lint warning surfaced in `apps/web/src/components/domains/resume-editor/fields/text-field.tsx` (unused `variant` parameter) — appears to have been introduced by a formatter pass on an unrelated file; I did not edit `text-field.tsx` myself. Worth deleting the unused param in a small follow-up if it nags the next contributor.
- No runtime browser test performed. Suggested manual flow below.

## Manual test plan (Session 2 additions)

1. **Timeline sort** — open a resume with multiple experience entries, mixed dates:
   - Newest `startDate` lands at the top.
   - Any entry with `isCurrent: true` floats above non-current entries regardless of `startDate`.
   - Entries with no `startDate` and not-current land at the bottom.
2. **Reorder animation** — edit a past entry's `startDate` to a future month. The row should translate smoothly to its new position (no abrupt jump).
3. **Add entry autofocus** — click "Agregar entrada". The new (empty) row appears at the bottom of the timeline; the viewport scrolls to it and the title input is focused.
4. **`isCurrent` toggle** — toggle Actual on a non-top entry. The row floats up; the dot fills (border + bg use `foreground`).
5. **Focus-within highlight** — tab into any entry. The row gets a muted background and the rail dot turns `primary`.
6. **Touch hover gating** — DevTools touch emulation: trash button no longer appears on hover; still reachable via tab focus.
7. **New-section sheet** — already-used options show a "Ya agregada" badge instead of a silent green check. Enabled items have a quiet 0.99 active scale.
8. **Section header** — kind icon + bigger title + entry count visible. AI/Edit buttons fade in on hover.
9. **Reduced motion** — enable `prefers-reduced-motion: reduce` in DevTools rendering panel. Reorder snaps to final position (no translate); opacity fade still acceptable.
10. **Rapid-add stress (bug-1 regression guard)** — click "Agregar entrada" 5× quickly. (a) no full doc re-mount, (b) `AnimatePresence` handles 5 entering keys without duplicate-key warnings, (c) all 5 land at the bottom in `position` desc order, (d) the last-clicked lands focused + scrolled into view.
11. **Bug-2 regression guard** — type "Acme" into an experience entry's `Cargo`, then click "Agregar entrada". "Acme" must remain in its field; the new empty entry appears below.

## Open items / follow-ups (Session 2)

- **Existing-data migration** (carry-over from Session 1) — any resume in production whose experience section title is still literally `"Experiencia laboral"` won't match `getSectionKind` → falls back to `custom` labels and won't get the Remoto checkbox / timeline sort / kind icon. Confirm whether any production data needs migrating.
- **`text-field.tsx` unused `variant` param** — surfaced as an ultracite warning during this session. Drop the param (and the `variant?` prop on `TextFieldProps`) in a small follow-up. Did not touch this turn since the param was already unused before this session's edits.
- **`as unknown as CreateBlockApiMutationInput` cast** (carry-over) in `use-block-mutations.ts:71` — duplicate `CreateBlockApiMutationInput` types appear at the orpc client boundary. Replace if/when orpc client types are unified.
- **Sheet primitive motion** — out of scope this PR; the centered inset sheet still animates from the right edge. Worth a follow-up to swap that variant to a center scale-in.
- **Sort fairness for `entryStyle === "publication"`** — publications often have a year-only date. Current behavior treats missing month as missing date and sinks the entry to the bottom of the timeline-kind sort. Not a problem today (no production data), but worth keeping in mind when we surface publications as a first-class section.

## Critical files (Session 2)

- `packages/schemas/src/db/resume-blocks.ts` — `sortEntriesByTimeline` added next to `buildBlockTree`.
- `apps/web/src/index.css` — easing tokens.
- `apps/web/src/components/domains/resume-editor/section-icons.ts` *(new)*.
- `apps/web/src/components/domains/resume-editor/timeline-section.tsx`.
- `apps/web/src/components/domains/resume-editor/editors/section-editor.tsx`.
- `apps/web/src/components/domains/resume-editor/editors/entry-editor.tsx`.
- `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx`.
- `apps/web/src/components/domains/resume-editor/fields/month-field.tsx`.

## Reused utilities (Session 2)

- `motion/react` (`AnimatePresence`, `motion`, `useReducedMotion`) — pattern continued from `resume-rich-text-editor.tsx:6`.
- `entryContentSchema.safeParse` — `packages/schemas/src/db/resume-blocks.ts`.
- `getSectionKind`, `SECTION_DEFINITIONS`, `ENTRY_LABELS`, `SectionKind` — `packages/schemas/src/api/resumes.ts`.
- `Badge` — already used in `timeline-section.tsx`.
- `sortLexoPositions` — kept for non-timeline section kinds and for in-section paragraphs/bullets.

---

# Carry-over items (still relevant across sessions)

- **Pacer-based draft create** ("only post to server when user types"). Considered, not implemented. Would replace the chain-serialize approach with a per-draft `AsyncDebouncer` gated on first content change. Adds ~50 lines in `use-resume-autosave.ts` for the draft-persistence path and pushes a third concern onto autosave (title + block update + block draft-create). Doesn't make code simpler. Current fix prevents the crash and the wiped-text symptom. Flip if the user wants strict "no blank blocks on server".
- **Server-side uniqueness** on `(resumeId, parentBlockId, position)`. Not strictly necessary once creates serialize client-side, but worth adding as defense-in-depth.
- **Existing-data migration** for the `"Experiencia laboral"` → `"Experiencia profesional"` rename. Same risk as before; now also affects timeline sort.
