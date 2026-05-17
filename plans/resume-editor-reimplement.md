# Resume Builder: Inline-PDF Rebuild

## Agent Start Here

### Goal

Rebuild resume editor so editing surface looks like exported PDF, while keeping current block model, autosave, mutations, schema, section rail, and section-creation flow.

Success means:

- editor feels like editing final document, not form UI
- persisted data shape stays compatible with current schemas and export/render paths
- add/delete/reorder/focus/autosave behavior stays reliable during optimistic updates

### Non-Goals

- true paginated document layout with measured page splitting
- drag-and-drop reordering
- schema redesign for richer title/contact markup
- export pipeline changes

### Current Reality

Current route at `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx` is form-first:

- labeled inputs
- card chrome (`Frame` / `FramePanel`)
- timeline rail accents inside entries
- section editing optimized for CRUD, not print preview

What already works and must stay:

- block tree / lexo ordering
- optimistic create/delete mutations
- autosave via form-level `onChange` / `onBlur`
- starter child creation for new sections
- left section rail + `section` query param

What may change if it improves correctness or UX:

- `apps/web/src/components/domains/resume-editor/use-block-mutations.ts`
- `apps/web/src/components/domains/resume-editor/use-resume-autosave.ts`
- `apps/web/src/components/domains/resume-editor/block-key-registry.ts`
- `apps/web/src/lib/forms/resume-form.tsx`

These are implementation details, not sacred API. If inline-document UX is cleaner or safer with hook changes, change hooks.

## Hard Constraints

These are hard constraints. All agents must follow them.

### Data Shape

Plain-text fields must stay plain text in persisted content. These are raw strings, not HTML:

- resume title
- contact first name
- contact last name
- contact item value
- section title
- entry title
- entry subtitle
- entry location
- skill line label
- skill item value

Rich-text HTML stays only where schema already supports it:

- `entry.content.descriptor` with `descriptorFormat`
- `paragraph.content.text` with `format`
- `bullet.content.text` with `format`

Avoid schema or server API changes unless implementation proves they are necessary. Hook-layer and client-side helper changes are in scope.

### Insertion Semantics

Use unambiguous neighbor naming in UI:

- `previousPosition`
- `nextPosition`

Map to API only at boundary:

- `before = previousPosition`
- `after = nextPosition`

Do not use ambiguous UI props named `before` / `after`.

### Deletion Safety

Delete old editor files only after:

- route no longer imports them
- form hook no longer imports deleted field components
- grep confirms zero importers

## Critical Contracts

### `InlineTextEditor` Contract

Props:

- `variant: "prose" | "heading" | "subtitle" | "plain"`
- `value`
- `onChange`
- `onBlur`
- `placeholder`
- `autoFocus?`
- `onEnterEmpty?` when block-aware delete behavior needed

Behavior:

- `prose`
  - emits `editor.getHTML()`
  - supports toolbar
  - supports lists
- `heading | subtitle | plain`
  - emits `editor.getText()`
  - never emits HTML wrappers
  - Enter blurs
  - empty state normalizes to `""`
- external value sync must not clobber active typing
- per-variant classes can stay inline in JSX

### Focus And Key Stability

Must preserve:

- optimistic block keys from `block-key-registry`
- autofocus on newly created entries
- focused-section scroll from rail selection

Preferred approach:

- `ResumeDocument` owns `scrollIntoView`
- render keys still use `getBlockKey(block.id)`
- use refs or explicit callbacks for autofocus, not brittle tag queries where avoidable

### Page Break Visual

Visual only. No measurement JS. No real page splitting.

Use:

- `--page-h: 80rem`
- inline `repeating-linear-gradient` on document shell
- transparent area until page boundary
- dashed 1px band at each boundary

Do not use `bg-repeat-y` + `bg-[length:12px_1px]`. That repeats every `1px`, not every page height.

## Critical Path

No parallel work until these first three items are done.

1. shared editor primitive
2. mutation hook semantics
3. section creation sheet insertion contract

Reason:

- UI work depends on plain-text vs HTML contract
- insertion UI depends on exact optimistic placement behavior
- autofocus behavior depends on created-block mutation contract

## Suggested Agent Work Split

Use this split only after Critical Path complete.

### Foundation Agent

Owns:

- `apps/web/src/components/domains/resume-document/inline-text-editor.tsx`
- `apps/web/src/components/domains/resume-editor/use-block-mutations.ts`
- `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx`
- maybe `apps/web/src/components/domains/resume-editor/block-key-registry.ts`

### Shell Agent

Owns:

- `apps/web/src/components/domains/resume-document/resume-document.tsx`
- `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx`

### Contact/Freeform Agent

Owns:

- `apps/web/src/components/domains/resume-document/inline-contact.tsx`
- `apps/web/src/components/domains/resume-document/inline-paragraph.tsx`
- freeform branch in `inline-section.tsx`

### Entries Agent

Owns:

- `apps/web/src/components/domains/resume-document/inline-entry.tsx`
- `apps/web/src/components/domains/resume-document/inline-bullet.tsx`
- `apps/web/src/components/domains/resume-document/inline-date-trigger.tsx`
- entries branch in `inline-section.tsx`

### Skills Agent

Owns:

- `apps/web/src/components/domains/resume-document/inline-skills.tsx`
- skills branch in `inline-section.tsx`

### Cleanup Agent

Owns:

- `apps/web/src/lib/forms/resume-form.tsx`
- old `resume-editor` render files and legacy field files

Rule:

- agents are not alone in codebase
- do not revert each other
- if `inline-section.tsx` becomes overlap risk, assign one integrating owner last

## File Inventory

### New Components

All new UI lives in `apps/web/src/components/domains/resume-document/`.

| File | Role |
|------|------|
| `resume-document.tsx` | top-level document shell; renders contact, sections, insert zones; owns focused-section scroll |
| `inline-text-editor.tsx` | shared Tiptap wrapper with explicit plain-text vs HTML persistence contract |
| `inline-contact.tsx` | contact block in print-like layout |
| `inline-section.tsx` | routes by section layout to freeform / entries / skills presenters |
| `inline-entry.tsx` | entry layout with inline title/subtitle/location/date/toggles/descriptor |
| `inline-bullet.tsx` | bullet block editor with block-aware delete/focus behavior |
| `inline-paragraph.tsx` | paragraph block editor |
| `inline-skills.tsx` | skill-line and skill-item editor layout |
| `inline-date-trigger.tsx` | text-like trigger wrapper for `MonthField` |
| `insert-section-zone.tsx` | hover affordance between sections using `previousPosition` / `nextPosition` |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx` | swap `ResumeDocumentEditor` for `ResumeDocument`; keep header/rail/query-param behavior; convert title editor to inline visual style without changing stored value shape |
| `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx` | accept optional `previousPosition` / `nextPosition`; support header append mode and inline insertion mode |
| `apps/web/src/components/domains/resume-editor/use-block-mutations.ts` | update create/delete helpers for exact insertion windows, stable optimistic behavior, and autofocus-friendly return values |
| `apps/web/src/components/domains/resume-editor/use-resume-autosave.ts` | adjust only if inline editors reveal debounce/flush edge cases |
| `apps/web/src/lib/forms/resume-form.tsx` | remove deleted field-component imports and register only components still used after rebuild |

### Files Deleted After Migration

- `apps/web/src/components/domains/resume-editor/resume-document-editor.tsx`
- `apps/web/src/components/domains/resume-editor/resume-rich-text-editor.tsx`
- `apps/web/src/components/domains/resume-editor/resume-rich-text-field.tsx`
- `apps/web/src/components/domains/resume-editor/timeline-section.tsx`
- `apps/web/src/components/domains/resume-editor/editors/` entire dir
- `apps/web/src/components/domains/resume-editor/fields/text-field.tsx`
- `apps/web/src/components/domains/resume-editor/fields/rich-text-field.tsx`
- `apps/web/src/components/domains/resume-editor/fields/checkbox-field.tsx` only after `resume-form.tsx` no longer imports it
- `apps/web/src/components/domains/resume-editor/fields/select-field.tsx` only after `resume-form.tsx` no longer imports it

### Files Kept

- `resume-editor/section-rail.tsx`
- `resume-editor/new-section-sheet.tsx`
- `resume-editor/use-resume-autosave.ts`
- `resume-editor/use-block-mutations.ts`
- `resume-editor/block-key-registry.ts`
- `resume-editor/section-icons.ts`
- `resume-editor/fields/month-field.tsx`
- `resume-editor/month-picker.tsx`
- `apps/web/src/lib/forms/resume-form.tsx`

## Ordered Implementation Plan

Do these in order. Later steps assume earlier contracts already landed.

### Step 1. Build shared editor primitive

Files:

- `apps/web/src/components/domains/resume-document/inline-text-editor.tsx`

Tasks:

- create `InlineTextEditor`
- implement `prose`, `heading`, `subtitle`, `plain`
- make prose variants emit `editor.getHTML()`
- make non-prose variants emit `editor.getText()`
- blur on Enter for single-line variants
- preserve external sync while unfocused
- support `autoFocus`

Done when:

- plain variants never emit HTML tags
- prose variant still supports toolbar and lists

### Step 2. Refactor mutation hooks for exact placement

Files:

- `apps/web/src/components/domains/resume-editor/use-block-mutations.ts`
- maybe `apps/web/src/components/domains/resume-editor/block-key-registry.ts`

Tasks:

- refactor `useCreateBlock.enqueue`
- preserve exact insertion window when both neighbors known
- if only `before`, treat as append-after-known-sibling
- if only `after`, treat as prepend-before-known-sibling
- derive tail append only when caller passes neither neighbor
- keep optimistic `generateLexoKeyBetween(before, after)` aligned with server payload
- confirm mutation result remains usable for autofocus flows
- confirm rollback still removes optimistic nodes cleanly

Done when:

- append still works
- middle insertion stays in intended slot
- rapid inserts do not collapse into tail-append behavior

### Step 3. Extend section creation sheet

Files:

- `apps/web/src/components/domains/resume-editor/new-section-sheet.tsx`

Tasks:

- accept `previousPosition` / `nextPosition`
- map to API `before` / `after`
- preserve header append-at-end behavior
- keep uniqueness rules unchanged

Done when:

- same sheet works for header append and inline insertion

### Step 4. Build document shell

Files:

- `apps/web/src/components/domains/resume-document/resume-document.tsx`

Tasks:

- render contact block and section blocks
- own focused-section scroll behavior
- apply print-like shell
- add page-break visual with repeating gradient
- keep dimming behavior for non-focused sections
- render empty state when needed

Done when:

- route can mount new shell with placeholder content
- page boundary visuals appear

### Step 5. Swap route to new shell

Files:

- `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx`

Tasks:

- replace `ResumeDocumentEditor` with `ResumeDocument`
- remove `registerSection` / `sectionRefs` route logic
- keep rail selection, save status, delete flow, query-param cleanup
- convert title field to inline visual editor while persisting plain string

Done when:

- route compiles against new shell
- title save still works

### Step 6. Migrate contact block

Files:

- `apps/web/src/components/domains/resume-document/inline-contact.tsx`

Tasks:

- render first/last name inline
- render contact item values inline
- keep kind selector or secondary control as needed
- preserve add/remove contact item flow

Done when:

- contact block has no legacy form chrome
- persisted values remain plain strings

### Step 7. Migrate freeform sections

Files:

- `apps/web/src/components/domains/resume-document/inline-section.tsx`
- `apps/web/src/components/domains/resume-document/inline-paragraph.tsx`

Tasks:

- render section title inline
- render paragraph children as prose editors
- preserve delete section affordance

Done when:

- summary-like sections fully work in new shell

### Step 8. Migrate entry sections

Files:

- `apps/web/src/components/domains/resume-document/inline-entry.tsx`
- `apps/web/src/components/domains/resume-document/inline-bullet.tsx`
- `apps/web/src/components/domains/resume-document/inline-date-trigger.tsx`
- entries branch in `inline-section.tsx`

Tasks:

- render title/subtitle/location as plain-text inline editors
- reuse `MonthField` with text-like trigger
- keep `isCurrent` / `isRemote` inline toggles
- render descriptor as prose editor
- render bullets as prose blocks
- preserve timeline ordering
- preserve autofocus for new entries
- preserve delete flows

Done when:

- experience / education / project-like sections work
- add-entry focuses correct field

### Step 9. Migrate skills and languages

Files:

- `apps/web/src/components/domains/resume-document/inline-skills.tsx`
- skills branch in `inline-section.tsx`

Tasks:

- render skill-line labels inline
- render skill-item values inline
- keep proficiency controls where needed
- preserve add/remove line and item flows
- preserve language-specific behavior

Done when:

- skills and languages sections have no card chrome

### Step 10. Add inline section insertion zones

Files:

- `apps/web/src/components/domains/resume-document/insert-section-zone.tsx`
- `apps/web/src/components/domains/resume-document/resume-document.tsx`

Tasks:

- render zones between each section and after last section
- wire each zone with `previousPosition` / `nextPosition`
- open `NewSectionSheet` from hover affordance
- ensure hover does not shift layout

Done when:

- mid-list insertion works
- tail insertion still works

### Step 11. Tighten autosave and focus edge cases

Files:

- `apps/web/src/components/domains/resume-editor/use-resume-autosave.ts` if needed
- `apps/web/src/components/domains/resume-document/*`

Tasks:

- verify plain-text editors trigger same form-level save listeners
- verify prose editors flush on blur
- verify fast focus changes do not lose last keystroke
- verify optimistic id migration does not remount focused editor unexpectedly

Done when:

- save status remains trustworthy
- no lost keystrokes or focus jumps

### Step 12. Remove old editor tree

Files:

- `apps/web/src/components/domains/resume-editor/editors/*`
- `apps/web/src/components/domains/resume-editor/resume-document-editor.tsx`
- `apps/web/src/components/domains/resume-editor/resume-rich-text-editor.tsx`
- `apps/web/src/components/domains/resume-editor/resume-rich-text-field.tsx`
- obsolete `fields/*`
- `apps/web/src/lib/forms/resume-form.tsx`

Tasks:

- remove obsolete form hook registrations
- delete old editor/render files
- grep for remaining imports
- keep only shared utilities still used by new shell

Done when:

- no imports remain to deleted files
- typecheck passes without compatibility shims

## Parallelization Rules

After Steps 1 through 3 land:

- Shell Agent can do Step 4 and Step 5
- Contact/Freeform Agent can do Step 6 and Step 7
- Entries Agent can do Step 8
- Skills Agent can do Step 9

Hold Step 10 until Shell + Foundation work merged.

Hold Step 12 until all feature steps merged.

If multiple agents touch `inline-section.tsx`, assign one final integrating owner.

## Verification

### Functional

1. `pnpm --filter web dev`
2. Open `/dash/resumes/<id>`
3. Confirm centered print-like document shell
4. Edit plain-text fields:
   - title
   - contact names
   - section title
   - entry title / subtitle / location
   - skill labels / values
5. Reload and confirm persisted values remain plain strings, not HTML tags
6. Edit prose fields:
   - descriptor
   - paragraph
   - bullet
7. Reload and confirm allowed HTML persists correctly
8. Add entry, section, skill line, skill item
9. Delete entry, bullet, skill item, section
10. Use rail selection and confirm scroll/focus behavior
11. Use inline insertion zone between two sections and verify resulting `position` sorts between neighbors
12. Use header `Agregar sección` and verify append-at-end behavior
13. Rapidly add two sections in different insertion zones and verify optimistic order remains correct
14. Rapidly add two entries and verify focus lands on newest created entry without remount glitches

### Visual

1. Dashed page boundary appears at each `--page-h`
2. No input chrome visible at rest
3. Hover affordances appear without layout shift
4. Toolbar appears only for prose editors
5. Current/remote toggles remain usable and visually lightweight

### Data-Shape Checks

Inspect payloads or query data after edits:

- plain-text fields do not store `<p>`
- prose fields store sanitized allowed tags only
- section creation still adds starter child block

### Final Checks

1. `pnpm --filter web typecheck`
2. `pnpm dlx ultracite check`
3. `rg -n "resume-document-editor|resume-rich-text-editor|resume-rich-text-field|timeline-section|fields/text-field|fields/select-field|fields/checkbox-field" apps/web/src`
