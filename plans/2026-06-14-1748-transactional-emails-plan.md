# Transactional emails: welcome + engagement nudge

Date: 2026-06-14
Status: proposed

## Goal

1. New `packages/transactional` package: Resend client + React Email templates, installable by `api`, `jobs`, anywhere.
2. Welcome email on signup that does **not** block the sign-in request — enqueued to a Trigger.dev task, sent async.
3. New daily Trigger.dev scheduled job that finds users who signed up 1–2 days ago but never engaged (no onboarding profile, no resume) and emails them a nudge. Send-once per user, idempotent.

## Constraints / decisions

- **Non-blocking welcome**: auth hook only does `tasks.trigger(...)` (a fast HTTP enqueue, ~ms) wrapped in try/catch; the actual render + Resend call happens inside the Trigger task. Signin never waits on Resend, never fails on Resend errors.
- **Signup-only hook**: use better-auth `databaseHooks.user.create.after` (fires once when the user row is created), NOT the existing `hooks.after` middleware (fires on every session/login). Confirmed available in better-auth 1.6.11.
- **Idempotency / dedup**: new `transactional_emails` table with a unique `(user_id, type)` index. Both tasks `insert(...).onConflictDoNothing()` and skip when the row already existed. Also pass Resend's idempotency key as a second guard against task retries double-sending.
- **`packages/transactional` stays pure**: rendering + sending only. No DB, no Trigger imports. Keeps it reusable and trivially testable. DB queries + scheduling live in `packages/jobs`.
- **Trigger build safety**: `jobs` already uses `@stackk-career/db/http` (`getTriggerDb`) to avoid the native libSQL binding during deploy indexing — reuse it. `resend` + `@react-email/*` are pure JS (fetch + react-dom/server), no native deps.
- **Engagement definition** (when we DO send the nudge): user is NOT engaged when `onboarding_profile` row is missing OR resume count = 0. "Logged in" alone is not a sufficient engagement signal (every signed-up user logged in once); we treat returning logins as a soft signal only and key the decision on onboarding + resume. Documented in the task.
- **Copy language**: Spanish (app default is `es` LATAM, per `generations.language`). English variant deferred.
- **No bold font weights** in template markup (per repo UI guideline); hierarchy via size/color.

## Package layout

```
packages/transactional/
  package.json            # name: @stackk-career/transactional
  tsconfig.json           # extends @stackk-career/config tsconfig.base
  src/
    client.ts             # const resend = new Resend(env.RESEND_API_KEY)
    send.ts               # sendEmail({ to, subject, react, idempotencyKey }) -> { id }
    index.ts              # sendWelcomeEmail(input), sendEngagementNudgeEmail(input)
    emails/
      welcome.tsx         # <WelcomeEmail name? />
      engagement-nudge.tsx# <EngagementNudgeEmail name? />
      components/
        layout.tsx        # shared <Html><Body><Container> shell + footer + CTA button
```

### package.json (exports + deps)

```jsonc
{
  "name": "@stackk-career/transactional",
  "type": "module",
  "exports": {
    ".": { "default": "./src/index.ts" },
    "./*": { "default": "./src/*.ts" }
  },
  "dependencies": {
    "@react-email/components": "catalog:",
    "@stackk-career/env": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:",
    "resend": "catalog:"
  },
  "devDependencies": {
    "@react-email/render": "catalog:",  // for unit tests (render to HTML)
    "@stackk-career/config": "workspace:*",
    "@types/react": "catalog:",
    "typescript": "^6.0.3"
  }
}
```

Add to `pnpm-workspace.yaml` catalog: `resend`, `@react-email/components`, `@react-email/render` (pin current majors at implementation time).

### client.ts / send.ts (shape)

```ts
// client.ts
import { env } from "@stackk-career/env/server";
import { Resend } from "resend";
export const resend = new Resend(env.RESEND_API_KEY);

// send.ts
import type { ReactElement } from "react";
import { env } from "@stackk-career/env/server";
import { resend } from "./client";

export async function sendEmail(input: {
  to: string;
  subject: string;
  react: ReactElement;
  idempotencyKey?: string;
}): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send(
    { from: env.EMAIL_FROM, to: input.to, subject: input.subject, react: input.react },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
  );
  if (error) throw new Error(`resend send failed: ${error.message}`);
  return { id: data?.id ?? "" };
}
```

`index.ts` exposes `sendWelcomeEmail({ to, name })` and `sendEngagementNudgeEmail({ to, name })`, each composing subject + template + `env.CORS_ORIGIN` CTA link and calling `sendEmail`.

## Env additions (`packages/env/src/server.ts`)

```ts
RESEND_API_KEY: z.string().min(1),
EMAIL_FROM: z.string().min(1),      // e.g. "Stackk Career <hola@mail.stackk.io>"
```

Reuse `CORS_ORIGIN` for CTA URLs (already the web app origin). Add the two new keys to root `.env` (and Trigger cloud env). `skipValidation` guard already covers Trigger indexing.

## DB: dedup/audit table

New `packages/db/src/schema/transactional-emails.ts`:

```ts
export const transactionalEmailTypes = ["welcome", "engagement_nudge"] as const;

export const transactionalEmails = sqliteTable(
  "transactional_emails",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => `txem_${createId()}`),
    userId: t.text().notNull().references(() => user.id, { onDelete: "cascade" }),
    type: t.text({ enum: transactionalEmailTypes }).notNull(),
    resendId: t.text(),
    sentAt: t.integer({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    createdAt: t.integer({ mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  }),
  (t) => [uniqueIndex("transactional_emails_user_type_idx").on(t.userId, t.type)]
);
```

- Export from `packages/db/src/schema/index.ts`.
- `pnpm db:generate` to create the migration; `pnpm db:push` for local.
- Unique `(user_id, type)` = one welcome + one nudge ever, per user. The dedup row is inserted **before/at** send with `onConflictDoNothing`; `result.rowsAffected === 0` (or empty `returning()`) means "already sent" → skip.

## Trigger jobs (`packages/jobs`)

Add `@stackk-career/transactional` to `packages/jobs/package.json` deps.

### 1. `send-welcome-email` (schemaTask)

`src/trigger/tasks/send-welcome-email.ts`

- schema (new `packages/schemas/src/jobs/transactional.ts`): `{ userId: string, email: string, name: string | null }`.
- run:
  1. `getTriggerDb()`; `insert(transactionalEmails).values({ userId, type: "welcome" }).onConflictDoNothing()` → if nothing inserted, log + return (idempotent).
  2. `await sendWelcomeEmail({ to: email, name })` with `idempotencyKey: \`welcome:${userId}\``.
  3. update the row's `resendId` (best-effort).
- `maxDuration: 30`, default retries.

### 2. `engagement-nudge` schedule + child send

`src/trigger/tasks/engagement-nudge.ts`

- `engagementNudgeScheduleTask = schedules.task({ id: "engagement-nudge", cron: "0 15 * * *", run })` (15:00 UTC ≈ mid-morning LATAM; tune timezone via `cron: { pattern, timezone: "America/Lima" }`).
- run:
  1. `getTriggerDb()`.
  2. Query eligible users (see below).
  3. `sendEngagementNudgeTask.batchTrigger(eligible.map(u => ({ payload: u })))` — per-user task gives independent retry + idempotency.
- `sendEngagementNudgeTask = schemaTask({ id: "send-engagement-nudge", schema: { userId, email, name }, run })`:
  1. Re-check eligibility (state may have changed since the scan) — if now engaged, skip.
  2. `insert(transactionalEmails).values({ userId, type: "engagement_nudge" }).onConflictDoNothing()` → skip if already sent.
  3. `sendEngagementNudgeEmail({ to: email, name })` with `idempotencyKey: \`nudge:${userId}\``.
  4. store `resendId`.

### Eligibility query

Window: `user.createdAt` in `[now - 2d, now - 1d]` (signed up 1–2 days ago — gives a stable once-a-day pass that catches everyone exactly once).

Not engaged: no `onboarding_profile` row OR zero `resumes` rows.

Not already nudged: no `transactional_emails` row with `type = 'engagement_nudge'`.

Drizzle sketch (extract into a pure-ish `selectEligibleForNudge(db, now)` helper so it's unit-testable):

```ts
const from = subDays(now, 2);
const to = subDays(now, 1);

const rows = await db
  .select({ id: user.id, email: user.email, name: user.name })
  .from(user)
  .leftJoin(onboardingProfile, eq(onboardingProfile.userId, user.id))
  .leftJoin(resumes, eq(resumes.userId, user.id))
  .leftJoin(
    transactionalEmails,
    and(eq(transactionalEmails.userId, user.id), eq(transactionalEmails.type, "engagement_nudge"))
  )
  .where(
    and(
      gte(user.createdAt, from),
      lte(user.createdAt, to),
      isNull(transactionalEmails.id),
      isNull(onboardingProfile.userId), // not-engaged side handled via grouping/having for resumes
    )
  )
  .groupBy(user.id)
  .having(/* count(resumes.id) = 0 OR onboarding missing */);
```

Note: combine the two "not engaged" conditions correctly — easiest is `groupBy(user.id)` + `having(or(isNull(onboardingProfile.userId), eq(count(resumes.id), 0)))`. Resolve exact drizzle `having`/`count` form during implementation; verify against local sqlite.

## Auth wiring (`packages/auth/src/index.ts`)

Add deps to `packages/auth/package.json`: `@trigger.dev/sdk` (runtime, for `tasks.trigger`) + `@stackk-career/jobs` (type-only import of the task).

```ts
import { tasks } from "@trigger.dev/sdk";
import type { sendWelcomeEmailTask } from "@stackk-career/jobs/trigger/tasks/send-welcome-email";

// inside betterAuth({ ... })
databaseHooks: {
  user: {
    create: {
      after: async (createdUser) => {
        try {
          await tasks.trigger<typeof sendWelcomeEmailTask>("send-welcome-email", {
            userId: createdUser.id,
            email: createdUser.email,
            name: createdUser.name ?? null,
          });
        } catch (err) {
          log.error({ auth: { action: "enqueue_welcome_email", userId: createdUser.id }, error: toError(err) });
        }
      },
    },
  },
},
```

No dependency cycle: `jobs` imports `db/env/schemas/transactional`, none import `auth`. The `<typeof task>` import is type-only (erased); the runtime trigger is by string id.

## Verification

- **Template render unit test** (`@react-email/render` + `node --test`): render `WelcomeEmail` and `EngagementNudgeEmail`, assert subject copy, CTA href = CORS_ORIGIN, recipient name interpolation, no `font-weight: bold`.
- **Eligibility unit test**: seed a local sqlite (libsql in-memory/file) with users at various ages + with/without onboarding/resume/prior-nudge; assert `selectEligibleForNudge` returns exactly the expected set (boundary: exactly 1d and 2d old; engaged via onboarding-only vs resume-only; already-nudged excluded).
- **Dedup test**: call the welcome insert twice; assert second is a no-op (no duplicate row, send skipped).
- **Manual smoke**: `pnpm jobs:dev`, trigger `send-welcome-email` with a test payload against Resend; trigger the schedule test run; confirm one email + one `transactional_emails` row.
- Do NOT send real email in automated tests (no network); test render + DB logic only.

## Out of scope

- English template variant.
- Email open/click analytics.
- Unsubscribe/preferences center (add a footer link placeholder now; wire later).

## Implementation order

1. Catalog + `packages/transactional` (client, send, templates, index) + render unit test.
2. Env keys (`RESEND_API_KEY`, `EMAIL_FROM`) + root `.env`.
3. DB table + migration + schema export.
4. `packages/schemas/src/jobs/transactional.ts` payload schema.
5. Jobs: `send-welcome-email` task; `engagement-nudge` schedule + child task + eligibility helper; export from `jobs/src/index.ts`.
6. Auth `databaseHooks.user.create.after` wiring + auth deps.
7. Tests (render, eligibility, dedup) + manual smoke via `jobs:dev`.
8. `pnpm check-types` across workspace; `ultracite fix`.
```