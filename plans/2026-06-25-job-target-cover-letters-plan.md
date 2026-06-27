# 2026-06-25 — Job-target-aware cover letters

## Goal

Make the post-tailoring path feel continuous: a user pastes a LinkedIn job listing, creates/imports a resume tailored to that listing, then creates a cover letter from the same resume and the same stored job data without re-pasting the job.

## Intent checkpoint

This plan assumes the resume job-target system already exists and is not proposing to rebuild it. The missing product seam is downstream: when a resume already has a ready job target, cover-letter creation should reuse that exact stored target plus the saved/tailored resume blocks instead of asking the user to paste or retype job data again.

Non-goals for this integration:

- Do not recreate LinkedIn job fetching, normalization, or resume target storage.
- Do not use denormalized resume fields as the source of truth for letters.
- Do not make users repeat job-position/job-description input when the selected resume already has a ready target.
- Do not block manual cover-letter creation for resumes without a ready target.

## Current findings

### Resume job targets already exist

- `packages/db/src/schema/resume-job-targets.ts` stores one target per resume (`uniqueIndex("rjt_resume_idx")`) with lifecycle `pending | fetching | ready | failed` and fields needed by cover letters: `sourceUrl`, `title`, `company`, `location`, `employmentType`, `seniority`, `description`, and `structured` JSON.
- `packages/schemas/src/jobs/linkedin-job-fetch.ts` defines the normalized `jobPostingSchema`: `title`, `company`, `location`, `employmentType`, `seniority`, `summary`, `responsibilities`, `qualifications`, `skills`, `keywords`.
- `packages/api/src/routers/resumes.ts` exposes `resumes.getJobTarget`, `resumes.changeJobTarget`, and includes `jobTargetStatus` in `resumes.list`.
- `packages/jobs/src/trigger/tasks/linkedin-job-fetch.ts` fetches and normalizes LinkedIn data, persists `resume_job_targets.status = "ready"`, and denormalizes `company/title` onto `resumes.targetedCompanyIdentifier/targetRole`.
- `packages/jobs/src/lib/resume-job-target.ts` already has the prompt-context seam used by resume analysis: `getResumeJobTarget(resumeId, userId)` + `buildJobTargetContextText(jobTarget)`.

### Resume tailoring already consumes job targets

- `packages/jobs/src/trigger/tasks/k02-detailed-analysis.ts` loads the ready target, builds `jobTargetText`, includes it in the detailed-analysis prompt, and builds a target-aware resume snapshot.
- `apps/web/src/components/domains/resume-editor/resume-analysis-section.tsx` changes UI copy to `Puntaje para este puesto` when the target is ready.
- `apps/web/src/components/domains/resume-editor/resume-job-target-note.tsx` polls `resumes.getJobTarget` while pending/fetching and shows the ready target details in the resume editor sidebar.

### Cover letters do not consume job targets yet

- `apps/web/src/components/domains/letters/letters-create-form.tsx` asks the user to manually enter `jobPosition` and optional `jobDescription`, then select a `resumeId`.
- `packages/schemas/src/api/letters.ts` requires `createCoverLetterGenerationInputSchema.jobPosition` and allows optional `jobDescription`; there is no job-target source field.
- `packages/api/src/routers/letters.ts` stores `jobPosition` in `generations.title`, `jobDescription` in `generations.summary`, and passes both into `casey-letters` during `letters.trigger`.
- `packages/jobs/src/trigger/tasks/casey-letters.ts` loads the selected resume from live `resume_blocks`; this already means an applied/tailored resume is what the cover letter sees.
- `packages/jobs/src/agents/casey-letters.handler.ts` receives only `jobPosition`, optional freeform `jobDescription`, resume plaintext, user metadata, previous letter, and extra prompt. It never reads `resume_job_targets`.

## Product decision

Use the selected resume as the seam.

- A cover letter can be created from any resume as today.
- If the selected resume has a ready job target, the cover-letter flow should prefer that stored target data over asking the user to paste the job again.
- The first implementation should avoid a DB migration: snapshot the selected job target into the existing cover-letter generation fields:
  - `generations.title` = normalized role label, e.g. `Senior Product Manager @ Yape`.
  - `generations.summary` = compact normalized job-target text, capped to the existing 5000-character `jobDescription` contract.
- Keep manual job-position/description as the fallback for resumes without a ready target, failed targets, or users who want a different letter target.
- Existing generated letters should remain readable and regenerable; they continue using their stored `generations.title/summary`.

If later we need audit-grade provenance or exact structured display for old letters, add `generations.jobTargetId` or `generations.jobTargetSnapshot` in a follow-up migration. Do not block the seamless UX on that migration.

## Target architecture

```mermaid
graph TD
  A[Resume create/import: LinkedIn URL + PDF/blank] --> B[resume_job_targets pending]
  B --> C[linkedin-job-fetch normalizes JobPosting]
  C --> D[Resume editor shows ready job target]
  D --> E[User applies/tailors resume edits]
  E --> F[CTA: create cover letter from this resume + target]
  F --> G[letters.createGeneration snapshots target into title/summary]
  G --> H[/dash/letters/:id auto-triggers CASEY]
  H --> I[casey-letters reads live tailored resume_blocks + stored job target summary]
  I --> J[CoverLetter artifact versions]
```

## Phase 1 — Shared job-target formatting contract

### Files

- `packages/schemas/src/jobs/linkedin-job-fetch.ts` or a new pure helper nearby, e.g. `packages/schemas/src/jobs/job-target-context.ts`.
- Update imports in `packages/jobs/src/lib/resume-job-target.ts` if extracting the existing formatting.

### Change

1. Add a pure formatter for cover-letter/job-target context, owned by `packages/schemas` so both API and jobs can use it without crossing package internals.
   - Input: parsed `JobPosting` plus denormalized `title/company/location/employmentType/seniority/sourceUrl`.
   - Output: `{ roleLabel: string; contextText: string }`.
2. Keep the output compact and deterministic:
   - role line: title + company.
   - meta: seniority, location, employment type.
   - summary.
   - responsibilities.
   - qualifications.
   - skills.
   - ATS keywords.
3. Cap `contextText` at 5000 characters to preserve `caseyLettersInputSchema.jobDescription` and `createCoverLetterGenerationInputSchema.jobDescription` limits.
4. Preserve the current resume-analysis wording in `buildJobTargetContextText` or migrate it to call the shared formatter with analysis-specific intro text.

### Acceptance

- One formatter becomes the source of truth for rendering normalized job data into prompt text.
- `k02-detailed-analysis` behavior stays equivalent.
- No API/UI behavior changes yet.

## Phase 2 — Server-side cover-letter creation from resume job target

### Files

- `packages/schemas/src/api/letters.ts`
- `packages/api/src/routers/letters.ts`
- `packages/db/src/schema/resume-job-targets.ts` only for imports, no schema change.

### Change

1. Extend `createCoverLetterGenerationInputSchema` with an explicit source choice. Recommended shape:

   ```ts
   source: z.enum(["manual", "resume-job-target"]).default("manual")
   ```

   Keep `jobPosition/jobDescription` for manual mode. In `resume-job-target` mode, `resumeId`, `language`, and `template` are enough.
2. In `letters.createGeneration`:
   - validate resume ownership as today.
   - if `source === "resume-job-target"`, query `resumeJobTargets` by `resumeId + userId`.
   - require `status === "ready"`; if pending/fetching, throw a user-facing `BAD_REQUEST` telling the UI to wait; if failed/missing, tell the UI to use manual mode or change the target.
   - `safeParse` `structured` with `jobPostingSchema`.
   - build `roleLabel/contextText` with the Phase 1 formatter.
   - insert the cover-letter generation with `title = roleLabel`, `summary = contextText`, `resumeId`, `language`, `template`.
3. Keep `letters.trigger` unchanged initially: it already reads `gen.title/gen.summary` and passes them to `casey-letters`.
4. Add logging fields for source and target status so failures are diagnosable.

### Acceptance

- API can create a cover-letter generation from a resume's ready target without client-supplied job text.
- API rejects pending/fetching/failed/missing targets explicitly.
- Existing manual `letters.createGeneration` calls continue to work.
- Generated letter detail route auto-trigger continues to work because `generations.title/summary` are populated.

## Phase 3 — Resume-editor CTA: finish with a cover letter

### Files

- `apps/web/src/components/domains/resume-editor/resume-job-target-note.tsx`
- optionally `apps/web/src/components/domains/resume-editor/resume-analysis-section.tsx`
- `apps/web/src/routes/_protected/dash/resumes/$resumeId.tsx` only if the CTA needs route-owned state.

### Change

1. In the ready state of `ResumeJobTargetPanel`, add a primary action: `Crear carta para este puesto`.
2. The action calls `orpc.letters.createGeneration` with:
   - `source: "resume-job-target"`
   - `resumeId`
   - default `language: "es"`
   - `template: null` unless a template picker is added in Phase 4.
3. On success:
   - invalidate `orpc.letters.list`.
   - navigate to `/dash/letters/$generationId`.
   - let the existing detail route auto-trigger the first draft.
4. For pending/fetching target state, show disabled copy: `Podrás crear la carta cuando terminemos de leer la oferta.`
5. For failed target state, keep the existing retry/change-target action and do not show a misleading create CTA.

### Acceptance

- From a resume with `jobTarget.status === "ready"`, one click creates a cover-letter workspace using that resume and target.
- The user does not re-enter job title or job description.
- The generated letter sees the currently saved resume blocks, so applied tailoring edits are included.
- Pending/fetching target does not create a targetless letter by accident.

## Phase 4 — Upgrade the generic letters create dialog

### Files

- `apps/web/src/components/domains/letters/letters-create-dialog.tsx`
- `apps/web/src/components/domains/letters/letters-create-form.tsx`
- `apps/web/src/routes/_protected/dash/letters/index.tsx`
- `apps/web/src/components/domains/letters/letter-card.tsx` optional display polish.

### Change

1. Make `LettersCreateForm` job-target-aware when a resume is selected:
   - use `resumes.list` `jobTargetStatus` for cheap badges in the CV selector.
   - fetch `orpc.resumes.getJobTarget` for the selected resume only.
   - if ready, show a compact target card (`title @ company`, skills/keywords summary) and default to `source: "resume-job-target"`.
   - offer `Escribir otro puesto manualmente` to switch to manual fields.
2. For resumes without a ready target, preserve the current manual fields.
3. If a selected resume target is pending/fetching, show loading copy and allow either waiting or switching to manual mode.
4. Consider search params for deep linking from resumes:
   - `/dash/letters?resumeId=<id>&source=resume-job-target` can open the dialog preselected.
   - This is optional if Phase 3 uses direct mutation.
5. Update empty-state/tutorial copy so the flow reads: choose a resume, reuse its job target when present, or enter job details manually.

### Acceptance

- Users who start from `/dash/letters` still get the seamless path when choosing a targeted resume.
- Manual cover-letter creation remains available.
- The form does not duplicate job data by pre-filling text fields and then hiding the true source; the chosen source is visible.

## Phase 5 — Prompt clarity and chat transparency

### Files

- `packages/jobs/src/agents/casey-letters.handler.ts`
- `packages/schemas/src/jobs/casey-letters.ts`
- `packages/jobs/src/trigger/tasks/casey-letters.ts`
- `apps/web/src/components/domains/letters/letters-chat-panel.tsx`

### Change

1. Rename prompt framing so normalized job context is not treated like arbitrary user text.
   - Keep `<USER_NOTES>` fenced as untrusted user input.
   - Replace or supplement `<JOB_DESCRIPTION>` with `<TARGET_JOB>` when the summary came from the normalized job target.
2. If adding explicit task input is worth the extra contract, extend `caseyLettersInputSchema` with `jobContextSource?: "manual" | "resume-job-target"` and pass it from `letters.trigger`.
3. Adjust CASEY hard rules:
   - target job data is factual context for employer needs.
   - it never authorizes fabricating candidate experience.
   - it can be used for company/team/role specificity and requirements alignment.
4. Add a visible chat/context chip for target reuse:
   - `CASEY usó la oferta de LinkedIn` or similar.
   - This can be static UI from `letters.get` metadata in a later schema phase, or a persisted tool row if the task actually loads target context.
5. Fix the stale comment in `packages/schemas/src/jobs/casey-letters.ts` that mentions `getSelectedResume`; the current implementation injects the CV directly and only defines `getUserMetadata`.

### Acceptance

- Prompt text distinguishes normalized job target context from user notes.
- Letter generation still obeys no-fabrication rules.
- UI makes it clear when the stored job listing powered the letter.

## Phase 6 — Verification and rollout

### Files / commands

- Run package-scoped checks after each implementation phase, not a broad root build unless needed:
  - `pnpm -F @stackk-career/schemas check-types`
  - `pnpm -F @stackk-career/api check-types`
  - `pnpm -F @stackk-career/jobs check-types`
  - `pnpm -F web check-types`
  - `pnpm dlx ultracite check` on touched files or root if practical.
- Browser smoke with dev server after UI phases:
  - create/import resume with LinkedIn URL.
  - wait for target ready in resume editor.
  - create cover letter from target CTA.
  - verify `/dash/letters/$generationId` auto-generates and pinned context shows the target + resume.
  - regenerate with an extra prompt and verify it still uses the same stored generation title/summary.

### Acceptance

- Manual cover-letter flow still works.
- Targeted-resume → cover-letter flow works without re-pasting job data.
- Pending/failed target states are explicit and do not silently fall back to wrong data.
- A tailored resume's applied edits appear in the cover letter because `casey-letters` reads live `resume_blocks`.
- No new linter/type errors in touched packages.

## Risks and guardrails

- **Async readiness:** PDF import can finish before `linkedin-job-fetch` is ready. Gate the one-click target CTA on `status === "ready"`; never create a target-sourced letter from pending data.
- **Stale denormalized resume fields:** Do not use `resumes.targetRole/targetedCompanyIdentifier` as the source of truth for letters. Load `resume_job_targets` and parse `structured`.
- **Snapshot vs live drift:** Phase 2 snapshots target text into `generations.summary`. This keeps old letters stable when a resume target changes later.
- **Applied vs suggested tailoring:** `casey-letters` reads saved `resume_blocks`, not pending resume-analysis suggestions. If the user has not applied suggested edits, the letter cannot cite them.
- **Prompt injection:** Keep manual job description and extra prompt fenced as untrusted input. Treat normalized target data as reference, not authority over system rules.
- **Character caps:** Keep formatted target context under 5000 chars unless the schemas are deliberately expanded.
